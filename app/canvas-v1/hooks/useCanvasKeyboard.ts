"use client";

/**
 * V3 Canvas Keyboard Shortcuts — all keyboard shortcuts for the unified canvas.
 *
 * Shortcuts don't fire when a text input/textarea/contentEditable is focused.
 */

import { useEffect } from "react";
import type { CanvasAction } from "@/lib/canvas/canvas-reducer";
import type { UnifiedCanvasState } from "@/lib/canvas/unified-canvas-state";

type KeyboardOptions = {
  state: UnifiedCanvasState;
  dispatch: React.Dispatch<CanvasAction>;
  onToggleLayers: () => void;
  onToggleInspector: () => void;
  onFocusPrompt: () => void;
};

export function useCanvasKeyboard({
  state,
  dispatch,
  onToggleLayers,
  onToggleInspector,
  onFocusPrompt,
}: KeyboardOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd+Z / Cmd+Shift+Z — Undo / Redo
      if (isMeta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }
      if (isMeta && e.key === "z") {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }

      // Cmd+D — Duplicate selected items
      if (isMeta && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        for (const itemId of state.selection.selectedItemIds) {
          dispatch({ type: "PUSH_HISTORY", description: "Duplicated item" });
          dispatch({ type: "DUPLICATE_ITEM", itemId });
        }
        return;
      }

      // Cmd+A — Select all items
      if (isMeta && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        // Select all by dispatching SELECT_ITEM with addToSelection for each
        // First deselect, then add all
        dispatch({ type: "DESELECT_ALL" });
        for (const item of state.items) {
          dispatch({ type: "SELECT_ITEM", itemId: item.id, addToSelection: true });
        }
        return;
      }

      // Delete / Backspace — Remove selected items
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selection.selectedItemIds.length > 0) {
          e.preventDefault();
          dispatch({ type: "PUSH_HISTORY", description: "Deleted items" });
          for (const itemId of state.selection.selectedItemIds) {
            dispatch({ type: "REMOVE_ITEM", itemId });
          }
        }
        return;
      }

      // Escape — Hierarchical deselect (Figma behavior)
      if (e.key === "Escape") {
        e.preventDefault();
        dispatch({ type: "ESCAPE" });
        return;
      }

      // Single key shortcuts (no modifier)
      if (!isMeta && !e.altKey) {
        // P — Focus prompt (opens inspector if hidden, expands prompt section, focuses textarea)
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          onFocusPrompt();
          return;
        }

        // L — Toggle layers panel
        if (e.key === "l" || e.key === "L") {
          e.preventDefault();
          onToggleLayers();
          return;
        }

        // I — Toggle inspector panel
        if (e.key === "i" || e.key === "I") {
          e.preventDefault();
          onToggleInspector();
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, dispatch, onToggleLayers, onToggleInspector, onFocusPrompt]);
}
