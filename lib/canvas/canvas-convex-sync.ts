/**
 * Signed-in canvas source of truth lives on the Convex `canvasDocuments`
 * row for the project (one document, one `revision` counter).
 *
 * localStorage (`studio-os:canvas-v3:*` + sync meta) is cache / offline
 * draft only. It must never replace a Convex document that has a different
 * (including newer) revision. See `decideSignedInCanvasSource`.
 */
import type { UnifiedCanvasState } from "./unified-canvas-state";
import { createEmptyCanvas } from "./unified-canvas-state";
import type { CanvasSyncMetadata } from "./canvas-persistence";
import { isConvexConfigured } from "@/lib/convex/is-configured";

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
  const candidate = value as { schemaVersion?: unknown; items?: unknown };
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

export type SignedInCanvasDecision =
  | "seed-local"
  | "adopt-remote"
  | "keep-local-push-unsynced"
  | "keep-local-in-sync";

/**
 * Conflict rule when the user is signed in and the project has a Convex id.
 *
 * 1. No usable remote document → seed Convex from the local cache (first write).
 * 2. No local sync meta → adopt remote. Cache cannot prove it is the same revision.
 * 3. `remote.revision !== local.revision` → adopt remote. localStorage NEVER
 *    wins over a newer remote revision, and a higher local revision is treated
 *    as stale cache metadata, not authority.
 * 4. Same revision and local `savedAt` is newer → unsynced draft of the revision
 *    we last pulled; keep local and push with `expectedRevision = that revision`.
 * 5. Same revision and local is not newer → already in sync; keep local, do not push.
 *
 * This function is the signed-in rule only. Offline (no Convex auth / no
 * project id) never calls it; localStorage is the working copy until sign-in.
 */
export function decideSignedInCanvasSource({
  localMeta,
  remoteDoc,
}: {
  localMeta: CanvasSyncMetadata | null;
  remoteDoc: RemoteCanvasDocument | null | undefined;
}): SignedInCanvasDecision {
  if (!remoteDoc || !isValidRemoteCanvasState(remoteDoc.state)) {
    return "seed-local";
  }
  if (localMeta == null) {
    return "adopt-remote";
  }
  if (remoteDoc.revision !== localMeta.revision) {
    return "adopt-remote";
  }
  const remoteTimestamp = remoteDoc.lastSavedAt || remoteDoc.updatedAt;
  if (localMeta.savedAt > remoteTimestamp) {
    return "keep-local-push-unsynced";
  }
  return "keep-local-in-sync";
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
  const decision = decideSignedInCanvasSource({ localMeta, remoteDoc });

  if (decision === "seed-local") {
    return {
      state: localState,
      meta: localMeta ?? {
        revision: 0,
        savedAt: parseStateUpdatedAt(localState) || now,
        source: "local",
      },
      appliedRevision: localMeta?.revision ?? null,
      shouldReplaceLocal: false,
      pushLocalToRemote: true,
    };
  }

  const remoteState = normalizeRemoteCanvasState(remoteDoc!.state);
  const remoteTimestamp = remoteDoc!.lastSavedAt || remoteDoc!.updatedAt;

  if (decision === "adopt-remote") {
    return {
      state: remoteState,
      meta: { revision: remoteDoc!.revision, savedAt: remoteTimestamp, source: "remote" },
      appliedRevision: remoteDoc!.revision,
      shouldReplaceLocal: true,
      pushLocalToRemote: false,
    };
  }

  if (decision === "keep-local-push-unsynced") {
    return {
      state: localState,
      meta: localMeta ?? { revision: remoteDoc!.revision, savedAt: now, source: "local" },
      appliedRevision: remoteDoc!.revision,
      shouldReplaceLocal: false,
      pushLocalToRemote: true,
    };
  }

  return {
    state: localState,
    meta: { revision: remoteDoc!.revision, savedAt: remoteTimestamp, source: "remote" },
    appliedRevision: remoteDoc!.revision,
    shouldReplaceLocal: false,
    pushLocalToRemote: false,
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
  return isConvexConfigured();
}
