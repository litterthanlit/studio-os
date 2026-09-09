import type { UnifiedCanvasState } from "./unified-canvas-state";

export const CANVAS_V3_SYNC_PREFIX = "studio-os:canvas-v3-sync:";

export type CanvasSyncMetadata = {
  revision: number;
  savedAt: number;
  source: "local" | "remote";
};

/**
 * Cache / offline-draft metadata. `revision` is copied from Convex after a
 * successful remote save; this helper must not increment it. A newer local
 * `savedAt` at the *same* revision is how signed-in reconcile detects an
 * unsynced draft. A different remote revision always wins — see
 * `decideSignedInCanvasSource` in canvas-convex-sync.ts.
 */
export function loadCanvasSyncMetadata(projectId: string): CanvasSyncMetadata | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${CANVAS_V3_SYNC_PREFIX}${projectId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CanvasSyncMetadata>;
    if (
      typeof parsed.revision !== "number" ||
      typeof parsed.savedAt !== "number" ||
      (parsed.source !== "local" && parsed.source !== "remote")
    ) {
      return null;
    }
    return parsed as CanvasSyncMetadata;
  } catch {
    return null;
  }
}

export function saveCanvasSyncMetadata(projectId: string, meta: CanvasSyncMetadata): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${CANVAS_V3_SYNC_PREFIX}${projectId}`, JSON.stringify(meta));
  } catch {
    // Non-critical metadata write failure.
  }
}

export function touchLocalCanvasSyncMetadata(projectId: string): void {
  const existing = loadCanvasSyncMetadata(projectId);
  saveCanvasSyncMetadata(projectId, {
    revision: existing?.revision ?? 0,
    savedAt: Date.now(),
    source: "local",
  });
}

/**
 * Strip transient / oversized fields before persisting to localStorage or Convex.
 * Shared serializer used by `prepareCanvasDocumentSave` (UI + agent writes).
 */
export function stripCanvasForPersistence(state: UnifiedCanvasState): UnifiedCanvasState {
  const strippedItems = state.items.map((item) => {
    if (item.kind === "artboard" && item.compiledCode) {
      return { ...item, compiledCode: null };
    }
    return item;
  });

  return {
    ...state,
    items: strippedItems,
    prompt: {
      ...state.prompt,
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
