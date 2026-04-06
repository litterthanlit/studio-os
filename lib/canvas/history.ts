/**
 * V3 Undo/Redo History Engine — snapshot-based, pure functions.
 *
 * Each history entry stores the full `items` array and selection state
 * from before a mutation. On undo, the current state is swapped with
 * the snapshot; on redo, it swaps back.
 *
 * No React, no side effects, no localStorage. The canvas reducer calls these.
 *
 * ─── Coalescing rules (enforced by the canvas reducer, not here) ───
 * - Drag: one pushHistory() on pointer-up with the pre-drag snapshot
 * - Text/style edits: one pushHistory() on blur, Enter, or 400ms idle debounce
 * - AI actions: one pushHistory() per completed AI action
 * - Generation: one pushHistory() replacing the active site
 * - Pan, zoom, hover, selection changes, in-progress drag: NEVER push to history
 */

import type { CanvasItem, UnifiedCanvasState } from "./unified-canvas-state";
import type { ComponentMaster } from "./design-node";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  description: string;
  stateBefore: CanvasItem[];
  selectionBefore: UnifiedCanvasState["selection"];
  componentsBefore: ComponentMaster[];  // NEW — Track 3
}

export interface HistoryStack {
  entries: HistoryEntry[];
  cursor: number; // Points to the current position (-1 = no history)
  maxEntries: number; // Cap at 50 to avoid memory bloat
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createHistoryStack(max: number = 50): HistoryStack {
  return {
    entries: [],
    cursor: -1,
    maxEntries: max,
  };
}

// ─── Push ────────────────────────────────────────────────────────────────────

/**
 * Record a new history entry. Call this BEFORE applying the mutation,
 * passing the current (pre-mutation) items and selection.
 *
 * If the cursor is not at the end, future entries are truncated
 * (standard undo behavior — branching discards the redo stack).
 *
 * If the stack exceeds maxEntries, the oldest entry is dropped.
 */
export function pushHistory(
  stack: HistoryStack,
  description: string,
  itemsBefore: CanvasItem[],
  selectionBefore: UnifiedCanvasState["selection"],
  componentsBefore: ComponentMaster[] = []
): HistoryStack {
  // Truncate any future entries beyond the cursor
  const entries = stack.entries.slice(0, stack.cursor + 1);

  // Add new entry
  entries.push({
    description,
    stateBefore: itemsBefore,
    selectionBefore,
    componentsBefore,
  });

  // Drop oldest if over the cap
  const overflow = entries.length - stack.maxEntries;
  if (overflow > 0) {
    entries.splice(0, overflow);
  }

  return {
    ...stack,
    entries,
    cursor: entries.length - 1,
  };
}

// ─── Undo ────────────────────────────────────────────────────────────────────

/**
 * Undo: restore the items/selection from the entry at `cursor`, then
 * store the current state into that entry so redo can restore it.
 *
 * Returns null if there's nothing to undo.
 */
export function undo(
  stack: HistoryStack,
  currentItems: CanvasItem[],
  currentSelection: UnifiedCanvasState["selection"],
  currentComponents: ComponentMaster[] = []
): {
  stack: HistoryStack;
  items: CanvasItem[];
  selection: UnifiedCanvasState["selection"];
  components: ComponentMaster[];
} | null {
  if (!canUndo(stack)) return null;

  const entry = stack.entries[stack.cursor];
  const restoredItems = entry.stateBefore;
  const restoredSelection = entry.selectionBefore;
  const restoredComponents = entry.componentsBefore;

  // Overwrite the entry with the current state so redo can get back to it
  const updatedEntries = [...stack.entries];
  updatedEntries[stack.cursor] = {
    ...entry,
    stateBefore: currentItems,
    selectionBefore: currentSelection,
    componentsBefore: currentComponents,
  };

  return {
    stack: {
      ...stack,
      entries: updatedEntries,
      cursor: stack.cursor - 1,
    },
    items: restoredItems,
    selection: restoredSelection,
    components: restoredComponents,
  };
}

// ─── Redo ────────────────────────────────────────────────────────────────────

/**
 * Redo: move cursor forward and restore the state stored there (which
 * was swapped in by the last undo). Store the current state back so
 * a subsequent undo can return to it.
 *
 * Returns null if there's nothing to redo.
 */
export function redo(
  stack: HistoryStack,
  currentItems: CanvasItem[],
  currentSelection: UnifiedCanvasState["selection"],
  currentComponents: ComponentMaster[] = []
): {
  stack: HistoryStack;
  items: CanvasItem[];
  selection: UnifiedCanvasState["selection"];
  components: ComponentMaster[];
} | null {
  if (!canRedo(stack)) return null;

  const nextCursor = stack.cursor + 1;
  const entry = stack.entries[nextCursor];
  const restoredItems = entry.stateBefore;
  const restoredSelection = entry.selectionBefore;
  const restoredComponents = entry.componentsBefore;

  // Swap: store current state into the entry so undo can get back to it
  const updatedEntries = [...stack.entries];
  updatedEntries[nextCursor] = {
    ...entry,
    stateBefore: currentItems,
    selectionBefore: currentSelection,
    componentsBefore: currentComponents,
  };

  return {
    stack: {
      ...stack,
      entries: updatedEntries,
      cursor: nextCursor,
    },
    items: restoredItems,
    selection: restoredSelection,
    components: restoredComponents,
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function canUndo(stack: HistoryStack): boolean {
  return stack.cursor >= 0;
}

export function canRedo(stack: HistoryStack): boolean {
  return stack.cursor < stack.entries.length - 1;
}
