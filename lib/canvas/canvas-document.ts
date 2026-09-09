/**
 * Shared canvas document write path (debut track 1).
 *
 * UI full-state saves and agent operation writes both serialize through
 * `prepareCanvasDocumentSave` / `applyCanvasDocumentWrite`, then persist
 * via Convex `saveCanvas` | `saveCanvasForAgent` | `saveCanvasForUserAgent`.
 * Those three mutations all call `persistCanvasState` in `convex/projects.ts`,
 * which is the only place `canvasDocuments.revision` increments.
 * Agent vs human authorship is stamped there (`lastWriter` / `lastAgentAt`).
 *
 * Do not add a second serializer or a second revision counter.
 */
import {
  applyCanvasAgentOperations,
  type CanvasAgentOperation,
} from "@/lib/agent/canvas-agent-ops";
import { stripCanvasForPersistence } from "@/lib/canvas/canvas-persistence";
import type { UnifiedCanvasState } from "@/lib/canvas/unified-canvas-state";

export const CANVAS_DOCUMENT_SCHEMA_VERSION = 4;

export type CanvasDocumentSavePayload = {
  state: UnifiedCanvasState;
  schemaVersion: number;
};

export type CanvasDocumentWriteResult = CanvasDocumentSavePayload & {
  applied: string[];
  errors: string[];
};

/**
 * Canonical persist payload. UI saves and agent writes must pass this
 * object (plus `expectedRevision`) into Convex so both land on the same
 * `canvasDocuments` row with the same stripped shape.
 */
export function prepareCanvasDocumentSave(
  state: UnifiedCanvasState,
): CanvasDocumentSavePayload {
  const stripped = stripCanvasForPersistence(state);
  return {
    state: stripped,
    schemaVersion: stripped.schemaVersion ?? CANVAS_DOCUMENT_SCHEMA_VERSION,
  };
}

/**
 * Agent mutation apply + the same persist serializer the editor uses.
 * Interactive UI edits still go through the canvas reducer; they join
 * this path at save time via `prepareCanvasDocumentSave`.
 */
export function applyCanvasDocumentWrite(
  currentState: UnifiedCanvasState | null,
  operations: CanvasAgentOperation[],
): CanvasDocumentWriteResult {
  const result = applyCanvasAgentOperations(currentState, operations);
  const payload = prepareCanvasDocumentSave(result.state);
  return {
    ...payload,
    applied: result.applied,
    errors: result.errors,
  };
}
