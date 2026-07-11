import type { UnifiedCanvasState } from "./unified-canvas-state";
import { createEmptyCanvas } from "./unified-canvas-state";
import type { CanvasSyncMetadata } from "./canvas-persistence";

export type RemoteCanvasDocument = {
  revision: number;
  state: unknown;
  lastSavedAt: number;
  updatedAt: number;
};

export type ReconcileResult = {
  state: UnifiedCanvasState;
  meta: CanvasSyncMetadata;
  appliedRevision: number | null;
  shouldReplaceLocal: boolean;
  pushLocalToRemote: boolean;
};

export {
  CANVAS_V3_SYNC_PREFIX,
  loadCanvasSyncMetadata,
  saveCanvasSyncMetadata,
  stripCanvasForPersistence,
  touchLocalCanvasSyncMetadata,
  type CanvasSyncMetadata,
} from "./canvas-persistence";

export function isValidRemoteCanvasState(value: unknown): value is UnifiedCanvasState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<UnifiedCanvasState>;
  return (
    (candidate.schemaVersion === 3 || candidate.schemaVersion === 4) &&
    Array.isArray(candidate.items)
  );
}

export function normalizeRemoteCanvasState(value: unknown): UnifiedCanvasState {
  if (!isValidRemoteCanvasState(value)) {
    return createEmptyCanvas();
  }

  const loadedState = value;
  loadedState.components ??= [];
  const empty = createEmptyCanvas();

  return {
    ...empty,
    ...loadedState,
    schemaVersion: 4,
    activeBreakpoint: loadedState.activeBreakpoint ?? "desktop",
    selection: {
      ...empty.selection,
      ...loadedState.selection,
      selectedNodeIds: loadedState.selection?.selectedNodeIds ?? [],
    },
    prompt: {
      ...empty.prompt,
      ...loadedState.prompt,
      isGenerating: false,
      agentSteps: [],
      generationResult: null,
    },
    aiPreview: null,
    masterEditSession: null,
    variantPreview: null,
    generatedTreeSnapshot: undefined,
    pendingTasteEdits: undefined,
  };
}

function parseStateUpdatedAt(state: UnifiedCanvasState): number {
  const parsed = Date.parse(state.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function reconcileCanvasSources({
  localState,
  localMeta,
  remoteDoc,
}: {
  localState: UnifiedCanvasState;
  localMeta: CanvasSyncMetadata | null;
  remoteDoc: RemoteCanvasDocument | null | undefined;
}): ReconcileResult {
  const now = Date.now();

  if (!remoteDoc || !isValidRemoteCanvasState(remoteDoc.state)) {
    return {
      state: localState,
      meta: localMeta ?? { revision: 0, savedAt: parseStateUpdatedAt(localState) || now, source: "local" },
      appliedRevision: localMeta?.revision ?? null,
      shouldReplaceLocal: false,
      pushLocalToRemote: true,
    };
  }

  const remoteState = normalizeRemoteCanvasState(remoteDoc.state);
  const remoteTimestamp = remoteDoc.lastSavedAt || remoteDoc.updatedAt;
  const localTimestamp = localMeta?.savedAt ?? parseStateUpdatedAt(localState);

  const remoteWins =
    localMeta == null
      ? true
      : remoteTimestamp > localTimestamp ||
        (remoteTimestamp === localTimestamp && remoteDoc.revision > localMeta.revision);

  if (remoteWins) {
    return {
      state: remoteState,
      meta: { revision: remoteDoc.revision, savedAt: remoteTimestamp, source: "remote" },
      appliedRevision: remoteDoc.revision,
      shouldReplaceLocal: true,
      pushLocalToRemote: false,
    };
  }

  return {
    state: localState,
    meta: localMeta ?? { revision: 0, savedAt: localTimestamp || now, source: "local" },
    appliedRevision: localMeta?.revision ?? null,
    shouldReplaceLocal: false,
    pushLocalToRemote: true,
  };
}

export function shouldPromptExternalReload(
  appliedRevision: number | null,
  remoteRevision: number | null | undefined
): boolean {
  if (appliedRevision == null || remoteRevision == null) return false;
  return remoteRevision > appliedRevision;
}

export function isConvexCanvasSyncConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
}
