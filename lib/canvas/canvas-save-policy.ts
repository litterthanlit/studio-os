/**
 * Canvas Convex write / snapshot policy.
 *
 * Before (Sep 2026 prod): every reducer change scheduled `saveCanvas` after
 * ~3.5s, and `persistCanvasState` inserted a `canvasSnapshots` row on every
 * revision. That produced ~1:1 save/load thrash and snapshot storage growth.
 *
 * After:
 * - Client schedules a Convex save only when the persist fingerprint changes.
 * - Trailing debounce (8s) after the last meaningful change; drag/pan bursts
 *   collapse to one save. Remote APPLY never schedules a save.
 * - Server no-ops when the fingerprint matches the stored `contentHash`
 *   (no revision bump, no query invalidation, no snapshot).
 * - Snapshots: every agent write, or every 20th user revision, or 10 minutes
 *   since the last snapshot. Keep the newest 20 per document; prune the rest.
 */
import { type CanvasPersistWriter } from "./canvas-content-hash";

export {
  hashCanvasPersistState,
  meaningfulCanvasPersistPayload,
  type CanvasPersistWriter,
} from "./canvas-content-hash";

export const LOCAL_CANVAS_SAVE_DEBOUNCE_MS = 500;
export const CONVEX_SAVE_DEBOUNCE_MS = 8_000;

export const CANVAS_SNAPSHOT_EVERY_N_REVISIONS = 20;
export const CANVAS_SNAPSHOT_MIN_INTERVAL_MS = 10 * 60 * 1000;
export const CANVAS_SNAPSHOT_KEEP_PER_DOCUMENT = 20;
export const CANVAS_SNAPSHOT_PRUNE_BATCH = 200;

export type ConvexSaveDecisionSource = "local" | "remote-apply";

export type ConvexSaveDecision = {
  schedule: boolean;
  adoptHash: boolean;
};

/**
 * Whether a reducer-driven state change should schedule `saveCanvas`.
 * Remote APPLY / LOAD must never cascade into another Convex write.
 */
export function decideConvexSaveAfterStateChange({
  source,
  persistHash,
  lastSavedHash,
}: {
  source: ConvexSaveDecisionSource;
  persistHash: string;
  lastSavedHash: string | null;
}): ConvexSaveDecision {
  if (source === "remote-apply") {
    return { schedule: false, adoptHash: true };
  }
  if (lastSavedHash != null && persistHash === lastSavedHash) {
    return { schedule: false, adoptHash: false };
  }
  return { schedule: true, adoptHash: false };
}

export function shouldWriteCanvasSnapshot({
  writer,
  isInsert,
  nextRevision,
  lastSnapshotAt,
  lastSnapshotRevision,
  now,
}: {
  writer: CanvasPersistWriter;
  isInsert: boolean;
  nextRevision: number;
  lastSnapshotAt: number | null | undefined;
  lastSnapshotRevision: number | null | undefined;
  now: number;
}): boolean {
  if (isInsert) return true;
  if (writer === "agent") return true;
  if (nextRevision <= 1) return true;
  if (lastSnapshotRevision == null || lastSnapshotAt == null) return true;
  if (nextRevision - lastSnapshotRevision >= CANVAS_SNAPSHOT_EVERY_N_REVISIONS) {
    return true;
  }
  if (now - lastSnapshotAt >= CANVAS_SNAPSHOT_MIN_INTERVAL_MS) return true;
  return false;
}

type DebounceEvent = {
  t: number;
  persistHash: string;
  source: ConvexSaveDecisionSource;
};

/**
 * Trailing-debounce model used by the proof gate: local meaningful edits in
 * one window collapse to one flush; remote apply cancels a pending flush and
 * must not emit a save.
 */
export function countTrailingDebounceFlushes(
  events: DebounceEvent[],
  debounceMs: number = CONVEX_SAVE_DEBOUNCE_MS,
): number {
  let lastSavedHash: string | null = null;
  let timerAt: number | null = null;
  let pendingHash: string | null = null;
  let flushes = 0;

  const flushDue = (t: number) => {
    if (timerAt == null || t < timerAt || pendingHash == null) return;
    if (pendingHash !== lastSavedHash) {
      flushes += 1;
      lastSavedHash = pendingHash;
    }
    timerAt = null;
    pendingHash = null;
  };

  for (const event of events) {
    flushDue(event.t);
    const decision = decideConvexSaveAfterStateChange({
      source: event.source,
      persistHash: event.persistHash,
      lastSavedHash,
    });
    if (event.source === "remote-apply") {
      lastSavedHash = event.persistHash;
      timerAt = null;
      pendingHash = null;
      continue;
    }
    if (!decision.schedule) continue;
    pendingHash = event.persistHash;
    timerAt = event.t + debounceMs;
  }

  flushDue(Number.POSITIVE_INFINITY);
  return flushes;
}
