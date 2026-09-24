// lib/agent/canvas-write-rebase.ts
// Agent canvas writes that survive concurrent designer saves: load → apply →
// save with expectedRevision; on CANVAS_REVISION_CONFLICT reload the newer
// document, re-apply the same operations, and retry (up to 3 retries). Agent
// operations (add_artboard, patch_node, add_code_item, …) are applied to the
// latest state, so the designer's edit and the agent's change both land.

import { applyCanvasDocumentWrite, type CanvasDocumentWriteResult } from "@/lib/canvas/canvas-document";
import { normalizeRemoteCanvasState } from "@/lib/canvas/canvas-convex-sync";
import type { UnifiedCanvasState } from "@/lib/canvas/unified-canvas-state";
import type { CanvasAgentOperation } from "./canvas-agent-ops";

export const MAX_CANVAS_WRITE_RETRIES = 3;

type CanvasDoc = { state?: unknown; revision?: number } | null;
type SaveResult = { revision: number; unchanged: boolean };

export type SelectionPersistence = {
  persisted: false;
  reason: string;
};

/**
 * Selection is not part of the persisted canvas fingerprint
 * (`meaningfulCanvasPersistPayload`), so a selection-only write is a no-op and
 * the open editor never receives it. Report that honestly until live presence
 * (master plan 3.4) carries agent selection.
 */
export const SELECTION_NOT_PERSISTED: SelectionPersistence = {
  persisted: false,
  reason:
    "Selection is excluded from the saved-canvas fingerprint, so a selection change alone is not saved and the open editor does not receive it. Agent selection arrives with live presence (master plan task 3.4).",
};

export function isRevisionConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("CANVAS_REVISION_CONFLICT");
}

export type CanvasWriteWithRebaseResult = CanvasDocumentWriteResult & {
  state: UnifiedCanvasState;
  save: SaveResult | null;
  /** Total save attempts (1 = no conflict). */
  attempts: number;
  rebased: boolean;
  selection?: SelectionPersistence;
};

export async function writeCanvasWithRebase(args: {
  load: () => Promise<CanvasDoc>;
  /** Already-loaded document for the first attempt (saves one read). */
  initialDoc?: CanvasDoc;
  save: (payload: { state: unknown; expectedRevision?: number; schemaVersion: number }) => Promise<SaveResult>;
  /** Operations for the given (latest) state — recomputed on every attempt. */
  buildOperations: (state: UnifiedCanvasState) => CanvasAgentOperation[];
  /**
   * Caller-pinned revision (optimistic lock). When set, a conflict is returned
   * to the caller instead of rebased.
   */
  pinnedRevision?: number;
  maxRetries?: number;
  onRebase?: (attempt: number) => void | Promise<void>;
}): Promise<CanvasWriteWithRebaseResult> {
  const maxRetries = args.pinnedRevision === undefined ? (args.maxRetries ?? MAX_CANVAS_WRITE_RETRIES) : 0;

  for (let attempt = 1; ; attempt++) {
    const doc = attempt === 1 && args.initialDoc !== undefined ? args.initialDoc : await args.load();
    const currentState = normalizeRemoteCanvasState(doc?.state ?? null);
    const operations = args.buildOperations(currentState);
    const written = applyCanvasDocumentWrite(currentState, operations);
    const selection = operations.some((op) => op.type === "set_selection") ? SELECTION_NOT_PERSISTED : undefined;

    if (written.applied.length === 0) {
      return { ...written, save: null, attempts: attempt, rebased: attempt > 1, ...(selection ? { selection } : {}) };
    }

    try {
      const save = await args.save({
        state: written.state,
        expectedRevision: args.pinnedRevision ?? doc?.revision,
        schemaVersion: written.schemaVersion,
      });
      return { ...written, save, attempts: attempt, rebased: attempt > 1, ...(selection ? { selection } : {}) };
    } catch (error) {
      if (!isRevisionConflict(error) || attempt > maxRetries) throw error;
      await args.onRebase?.(attempt);
    }
  }
}
