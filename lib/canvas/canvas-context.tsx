"use client";

/**
 * V3 Canvas Context — React provider that wires the canvas reducer to
 * persistence, keyboard shortcuts, and the component tree.
 *
 * Signed-in + Convex project id: the `canvasDocuments` row is source of truth.
 * UI saves go through `prepareCanvasDocumentSave` → `api.projects.saveCanvas`
 * (same `persistCanvasState` / revision bump as agent writes). localStorage
 * is cache/offline draft only — see `decideSignedInCanvasSource`.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  canvasReducer,
  createInitialReducerState,
  canUndoState,
  canRedoState,
  type CanvasAction,
  type CanvasReducerState,
} from "./canvas-reducer";
import type { UnifiedCanvasState } from "./unified-canvas-state";
import {
  loadUnifiedCanvas,
  saveUnifiedCanvas,
  createEmptyCanvas,
} from "./unified-canvas-state";
import { hydrateSampleProjectCanvas } from "./sample-project";
import { hydrateStarterCanvas } from "./starter-canvas";
import { migrateToSingleArtboard } from "./migrate-responsive";
import {
  isConvexCanvasSyncConfigured,
  loadCanvasSyncMetadata,
  normalizeRemoteCanvasState,
  reconcileCanvasSources,
  saveCanvasSyncMetadata,
  shouldPromptExternalReload,
} from "./canvas-convex-sync";
import { prepareCanvasDocumentSave } from "./canvas-document";
import { useConvexProjectId } from "./use-convex-project-id";
import { ExternalCanvasUpdateToast } from "@/app/canvas-v1/components/ExternalCanvasUpdateToast";

const CONVEX_SAVE_THROTTLE_MS = 3500;

// ─── Context ─────────────────────────────────────────────────────────────────

type CanvasContextValue = {
  state: UnifiedCanvasState;
  dispatch: React.Dispatch<CanvasAction>;
  canUndo: boolean;
  canRedo: boolean;
};

export const CanvasContext = createContext<CanvasContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function CanvasProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const [reducerState, dispatch] = useReducer(
    canvasReducer,
    createEmptyCanvas(),
    (initial) => createInitialReducerState(initial)
  );
  const [externalUpdateVisible, setExternalUpdateVisible] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const convexSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const convexSaveInFlightRef = useRef(false);
  const convexRetryPendingRef = useRef(false);
  const convexWriteBlockedRef = useRef(false);
  const skipConvexSaveRef = useRef(false);

  const loadedItemCountRef = useRef(-1);
  const loadedForProjectRef = useRef<string | null>(null);
  const hasInitialReconciledRef = useRef(false);
  const appliedRemoteRevisionRef = useRef<number | null>(null);
  const convexRevisionRef = useRef<number | null>(null);
  const pendingConvexStateRef = useRef<UnifiedCanvasState | null>(null);

  const currentUser = useQuery(api.users.current, isConvexCanvasSyncConfigured() ? {} : "skip");
  const convexSyncEnabled = isConvexCanvasSyncConfigured() && Boolean(currentUser);
  const convexProjectId = useConvexProjectId(projectId, convexSyncEnabled);
  const remoteDoc = useQuery(
    api.projects.loadCanvas,
    convexSyncEnabled && convexProjectId ? { projectId: convexProjectId } : "skip"
  );
  const saveCanvasMutation = useMutation(api.projects.saveCanvas);

  const loadLocalCanvasState = useCallback((): UnifiedCanvasState => {
    let loaded = loadUnifiedCanvas(projectId);
    loaded = migrateToSingleArtboard(loaded);
    loaded = hydrateSampleProjectCanvas(projectId, loaded);
    loaded = hydrateStarterCanvas(projectId, loaded);
    return loaded;
  }, [projectId]);

  const applyLoadedState = useCallback((state: UnifiedCanvasState) => {
    loadedItemCountRef.current = state.items.length;
    dispatch({ type: "LOAD_STATE", state });
  }, []);

  // On mount: load persisted local state synchronously.
  useEffect(() => {
    loadedItemCountRef.current = -1;
    loadedForProjectRef.current = projectId;
    hasInitialReconciledRef.current = false;
    appliedRemoteRevisionRef.current = null;
    convexRevisionRef.current = null;
    convexRetryPendingRef.current = false;
    convexWriteBlockedRef.current = false;
    skipConvexSaveRef.current = false;
    pendingConvexStateRef.current = null;
    setExternalUpdateVisible(false);

    applyLoadedState(loadLocalCanvasState());
  }, [applyLoadedState, loadLocalCanvasState, projectId]);

  const flushConvexSave = useCallback(async () => {
    if (!convexSyncEnabled || !convexProjectId) return;
    if (!hasInitialReconciledRef.current) return;
    if (convexWriteBlockedRef.current) return;
    const state = pendingConvexStateRef.current;
    if (!state || convexSaveInFlightRef.current) return;

    convexSaveInFlightRef.current = true;
    const payload = prepareCanvasDocumentSave(state);

    try {
      const result = await saveCanvasMutation({
        projectId: convexProjectId,
        state: payload.state,
        expectedRevision: convexRevisionRef.current ?? undefined,
        schemaVersion: payload.schemaVersion,
      });

      convexRevisionRef.current = result.revision;
      appliedRemoteRevisionRef.current = result.revision;
      saveCanvasSyncMetadata(projectId, {
        revision: result.revision,
        savedAt: Date.now(),
        source: "remote",
      });
      convexRetryPendingRef.current = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("CANVAS_REVISION_CONFLICT")) {
        // Signed-in SoT: do not overwrite a newer remote revision from an
        // agent write. Local remains cache/draft until the user reloads.
        console.warn(
          "[canvas] Convex revision conflict — remote is source of truth; not overwriting",
          { projectId }
        );
        convexWriteBlockedRef.current = true;
        setExternalUpdateVisible(true);
      } else {
        console.warn("[canvas] Convex save failed", { projectId, message });
        if (!convexRetryPendingRef.current) {
          convexRetryPendingRef.current = true;
          window.setTimeout(() => {
            convexRetryPendingRef.current = false;
            void flushConvexSave();
          }, 1500);
        }
      }
    } finally {
      convexSaveInFlightRef.current = false;
    }
  }, [convexProjectId, convexSyncEnabled, projectId, saveCanvasMutation]);

  // Initial reconciliation once remote canvas is available.
  useEffect(() => {
    if (!convexSyncEnabled || !convexProjectId || remoteDoc === undefined) return;
    if (hasInitialReconciledRef.current) return;

    const localState = loadLocalCanvasState();
    const localMeta = loadCanvasSyncMetadata(projectId);
    const remote = remoteDoc
      ? {
          revision: remoteDoc.revision,
          state: remoteDoc.state,
          lastSavedAt: remoteDoc.lastSavedAt,
          updatedAt: remoteDoc.updatedAt,
        }
      : null;

    const result = reconcileCanvasSources({
      localState,
      localMeta,
      remoteDoc: remote,
    });

    hasInitialReconciledRef.current = true;
    appliedRemoteRevisionRef.current = result.appliedRevision;
    convexRevisionRef.current = result.appliedRevision;

    if (result.shouldReplaceLocal) {
      skipConvexSaveRef.current = true;
      applyLoadedState(result.state);
      saveUnifiedCanvas(projectId, result.state);
      pendingConvexStateRef.current = result.state;
      saveCanvasSyncMetadata(projectId, result.meta);
    } else if (result.pushLocalToRemote) {
      pendingConvexStateRef.current = result.state;
      void flushConvexSave();
    } else {
      saveCanvasSyncMetadata(projectId, result.meta);
    }
  }, [
    applyLoadedState,
    convexProjectId,
    convexSyncEnabled,
    flushConvexSave,
    loadLocalCanvasState,
    projectId,
    remoteDoc,
  ]);

  const latestStateRef = useRef(reducerState);
  useEffect(() => {
    latestStateRef.current = reducerState;
  }, [reducerState]);

  // On state change (debounced 500ms): persist locally and schedule Convex save.
  useEffect(() => {
    const isHydrated =
      loadedForProjectRef.current === projectId &&
      loadedItemCountRef.current >= 0 &&
      (loadedItemCountRef.current === 0 || reducerState.items.length > 0);

    if (!isHydrated) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const nextState = extractCanvasState(reducerState);
      saveUnifiedCanvas(projectId, nextState);
      pendingConvexStateRef.current = nextState;

      if (skipConvexSaveRef.current) {
        skipConvexSaveRef.current = false;
        return;
      }

      if (convexSyncEnabled && !hasInitialReconciledRef.current) {
        return;
      }

      if (convexSaveTimerRef.current) {
        clearTimeout(convexSaveTimerRef.current);
      }
      convexSaveTimerRef.current = setTimeout(() => {
        void flushConvexSave();
      }, CONVEX_SAVE_THROTTLE_MS);
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (convexSaveTimerRef.current) {
        clearTimeout(convexSaveTimerRef.current);
      }
    };
  }, [convexSyncEnabled, flushConvexSave, projectId, reducerState]);

  // Flush pending save on unmount (HMR, navigation) so state is never lost.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (convexSaveTimerRef.current) {
        clearTimeout(convexSaveTimerRef.current);
      }

      const loaded = loadedItemCountRef.current;
      const current = latestStateRef.current.items.length;
      if (loaded >= 0 && (loaded === 0 || current >= loaded)) {
        const nextState = extractCanvasState(latestStateRef.current);
        saveUnifiedCanvas(projectId, nextState);
        pendingConvexStateRef.current = nextState;
        if (convexSyncEnabled && convexProjectId && hasInitialReconciledRef.current) {
          void flushConvexSave();
        }
      }
    };
  }, [convexProjectId, convexSyncEnabled, flushConvexSave, projectId]);

  // Auto-apply newer Convex revisions from agents. Toast only when a local
  // save is in flight or master-edit would make a silent apply unsafe.
  useEffect(() => {
    if (!convexSyncEnabled || !remoteDoc || !hasInitialReconciledRef.current) return;
    if (!shouldPromptExternalReload(appliedRemoteRevisionRef.current, remoteDoc.revision)) {
      return;
    }

    const hasPendingLocalSave =
      convexSaveInFlightRef.current ||
      convexRetryPendingRef.current ||
      convexSaveTimerRef.current != null ||
      saveTimerRef.current != null;

    if (hasPendingLocalSave || latestStateRef.current.masterEditSession) {
      setExternalUpdateVisible(true);
      return;
    }

    if (!remoteDoc.state) {
      setExternalUpdateVisible(true);
      return;
    }

    skipConvexSaveRef.current = true;
    convexWriteBlockedRef.current = false;
    const nextState = normalizeRemoteCanvasState(remoteDoc.state);
    loadedItemCountRef.current = nextState.items.length;
    dispatch({ type: "APPLY_REMOTE_STATE", state: nextState });
    saveUnifiedCanvas(projectId, nextState);
    pendingConvexStateRef.current = nextState;
    appliedRemoteRevisionRef.current = remoteDoc.revision;
    convexRevisionRef.current = remoteDoc.revision;
    saveCanvasSyncMetadata(projectId, {
      revision: remoteDoc.revision,
      savedAt: remoteDoc.lastSavedAt || remoteDoc.updatedAt,
      source: "remote",
    });
    setExternalUpdateVisible(false);
  }, [convexSyncEnabled, projectId, remoteDoc, remoteDoc?.revision]);

  useEffect(() => {
    if (!convexSyncEnabled || !convexProjectId) return;

    function onFocus() {
      if (
        remoteDoc &&
        shouldPromptExternalReload(appliedRemoteRevisionRef.current, remoteDoc.revision)
      ) {
        setExternalUpdateVisible(true);
      }
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [convexProjectId, convexSyncEnabled, remoteDoc, remoteDoc?.revision]);

  const handleExternalReload = useCallback(() => {
    if (!remoteDoc?.state) {
      setExternalUpdateVisible(false);
      return;
    }

    const nextState = normalizeRemoteCanvasState(remoteDoc.state);
    skipConvexSaveRef.current = true;
    convexWriteBlockedRef.current = false;
    loadedItemCountRef.current = nextState.items.length;
    dispatch({ type: "APPLY_REMOTE_STATE", state: nextState });
    saveUnifiedCanvas(projectId, nextState);
    pendingConvexStateRef.current = nextState;
    appliedRemoteRevisionRef.current = remoteDoc.revision;
    convexRevisionRef.current = remoteDoc.revision;
    saveCanvasSyncMetadata(projectId, {
      revision: remoteDoc.revision,
      savedAt: remoteDoc.lastSavedAt || remoteDoc.updatedAt,
      source: "remote",
    });
    setExternalUpdateVisible(false);
  }, [projectId, remoteDoc]);

  const contextValue: CanvasContextValue = {
    state: extractCanvasState(reducerState),
    dispatch,
    canUndo: canUndoState(reducerState),
    canRedo: canRedoState(reducerState),
  };

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
      <ExternalCanvasUpdateToast
        visible={externalUpdateVisible}
        onReload={handleExternalReload}
        onDismiss={() => setExternalUpdateVisible(false)}
      />
    </CanvasContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCanvas(): CanvasContextValue {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}

// ─── Internal ────────────────────────────────────────────────────────────────

function extractCanvasState(state: CanvasReducerState): UnifiedCanvasState {
  const { history: _, ...canvasState } = state;
  return canvasState;
}
