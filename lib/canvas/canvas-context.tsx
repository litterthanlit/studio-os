"use client";

/**
 * V3 Canvas Context — React provider that wires the canvas reducer to
 * persistence, keyboard shortcuts, and the component tree.
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
  stripCanvasForPersistence,
} from "./canvas-convex-sync";
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

  const loadedItemCountRef = useRef(-1);
  const loadedForProjectRef = useRef<string | null>(null);
  const hasInitialReconciledRef = useRef(false);
  const appliedRemoteRevisionRef = useRef<number | null>(null);
  const convexRevisionRef = useRef<number | null>(null);
  const pendingConvexStateRef = useRef<UnifiedCanvasState | null>(null);

  const currentUser = useQuery(api.users.current, {});
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
    pendingConvexStateRef.current = null;
    setExternalUpdateVisible(false);

    applyLoadedState(loadLocalCanvasState());
  }, [applyLoadedState, loadLocalCanvasState, projectId]);

  const flushConvexSave = useCallback(
    async (forceLastWriteWins = false) => {
      if (!convexSyncEnabled || !convexProjectId) return;
      const state = pendingConvexStateRef.current;
      if (!state || convexSaveInFlightRef.current) return;

      convexSaveInFlightRef.current = true;
      const stripped = stripCanvasForPersistence(state);

      try {
        const result = await saveCanvasMutation({
          projectId: convexProjectId,
          state: stripped,
          expectedRevision:
            forceLastWriteWins || convexRevisionRef.current == null
              ? undefined
              : convexRevisionRef.current,
          schemaVersion: 4,
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
          console.warn(
            "[canvas] Convex revision conflict — retrying with last-write-wins",
            { projectId }
          );
          if (!convexRetryPendingRef.current) {
            convexRetryPendingRef.current = true;
            convexRevisionRef.current = remoteDoc?.revision ?? convexRevisionRef.current;
            convexSaveInFlightRef.current = false;
            await flushConvexSave(true);
          }
        } else {
          console.warn("[canvas] Convex save failed", { projectId, message });
          if (!convexRetryPendingRef.current) {
            convexRetryPendingRef.current = true;
            window.setTimeout(() => {
              convexRetryPendingRef.current = false;
              void flushConvexSave(forceLastWriteWins);
            }, 1500);
          }
        }
      } finally {
        convexSaveInFlightRef.current = false;
      }
    },
    [convexProjectId, convexSyncEnabled, projectId, remoteDoc?.revision, saveCanvasMutation]
  );

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
      applyLoadedState(result.state);
      saveUnifiedCanvas(projectId, result.state);
      saveCanvasSyncMetadata(projectId, result.meta);
    } else if (result.pushLocalToRemote) {
      pendingConvexStateRef.current = result.state;
      void flushConvexSave();
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
        if (convexSyncEnabled && convexProjectId) {
          void flushConvexSave();
        }
      }
    };
  }, [convexProjectId, convexSyncEnabled, flushConvexSave, projectId]);

  // Detect external canvas updates while the editor is open.
  useEffect(() => {
    if (!convexSyncEnabled || !remoteDoc || !hasInitialReconciledRef.current) return;
    if (
      shouldPromptExternalReload(appliedRemoteRevisionRef.current, remoteDoc.revision)
    ) {
      setExternalUpdateVisible(true);
    }
  }, [convexSyncEnabled, remoteDoc, remoteDoc?.revision]);

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
    applyLoadedState(nextState);
    saveUnifiedCanvas(projectId, nextState);
    appliedRemoteRevisionRef.current = remoteDoc.revision;
    convexRevisionRef.current = remoteDoc.revision;
    saveCanvasSyncMetadata(projectId, {
      revision: remoteDoc.revision,
      savedAt: remoteDoc.lastSavedAt || remoteDoc.updatedAt,
      source: "remote",
    });
    setExternalUpdateVisible(false);
  }, [applyLoadedState, projectId, remoteDoc]);

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
