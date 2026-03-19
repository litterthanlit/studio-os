/**
 * V3 Canvas Reducer — useReducer-style state engine for the unified canvas.
 *
 * Handles all mutations, selection, viewport, history, prompt, and generation actions.
 * History is managed via the snapshot-based history engine (history.ts).
 */

import type { PageNode, PageNodeStyle } from "./compose";
import type {
  UnifiedCanvasState,
  CanvasItem,
  ArtboardItem,
  PromptRun,
} from "./unified-canvas-state";
import {
  createHistoryStack,
  pushHistory,
  undo,
  redo,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
  type HistoryStack,
} from "./history";

// ─── Action Types ────────────────────────────────────────────────────────────

export type CanvasAction =
  // Items
  | { type: "ADD_ITEM"; item: CanvasItem }
  | { type: "REMOVE_ITEM"; itemId: string }
  | { type: "DUPLICATE_ITEM"; itemId: string }
  | { type: "UPDATE_ITEM"; itemId: string; changes: Partial<CanvasItem> }
  | { type: "MOVE_ITEM"; itemId: string; x: number; y: number }
  | { type: "REORDER_ITEM"; itemId: string; newZIndex: number }

  // Artboard node editing
  | { type: "UPDATE_NODE"; artboardId: string; nodeId: string; changes: Partial<PageNode> }
  | { type: "UPDATE_NODE_STYLE"; artboardId: string; nodeId: string; style: Partial<PageNodeStyle> }

  // Selection
  | { type: "SELECT_ITEM"; itemId: string; addToSelection?: boolean }
  | { type: "SELECT_NODE"; artboardId: string; nodeId: string }
  | { type: "DESELECT_ALL" }
  | { type: "ESCAPE" }

  // Viewport
  | { type: "SET_VIEWPORT"; pan: { x: number; y: number }; zoom: number }

  // History
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "PUSH_HISTORY"; description: string }

  // Prompt
  | { type: "SET_PROMPT"; value: string }
  | { type: "SET_SITE_TYPE"; siteType: import("./templates").SiteType }
  | { type: "TOGGLE_PROMPT_PANEL" }
  | { type: "SET_SPLIT_RATIO"; ratio: number }
  | { type: "ADD_PROMPT_HISTORY"; entry: PromptRun }

  // Generation
  | { type: "REPLACE_SITE"; artboards: ArtboardItem[]; promptEntry: PromptRun }

  // Persistence
  | { type: "LOAD_STATE"; state: UnifiedCanvasState };

// ─── Reducer State (extends UnifiedCanvasState with in-memory history) ───────

export type CanvasReducerState = UnifiedCanvasState & {
  history: HistoryStack;
};

export function createInitialReducerState(canvas: UnifiedCanvasState): CanvasReducerState {
  return {
    ...canvas,
    history: createHistoryStack(50),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Recursively update a node within a PageNode tree by nodeId.
 */
function updateNodeInTree(
  node: PageNode,
  nodeId: string,
  updater: (n: PageNode) => PageNode
): PageNode {
  if (node.id === nodeId) return updater(node);
  if (!node.children) return node;

  const updatedChildren = node.children.map((child) =>
    updateNodeInTree(child, nodeId, updater)
  );

  // Only create a new object if a child actually changed
  if (updatedChildren.every((child, i) => child === node.children![i])) {
    return node;
  }

  return { ...node, children: updatedChildren };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function canvasReducer(
  state: CanvasReducerState,
  action: CanvasAction
): CanvasReducerState {
  switch (action.type) {
    // ── Items ──────────────────────────────────────────────────────────────

    case "ADD_ITEM": {
      return {
        ...state,
        items: [...state.items, action.item],
        updatedAt: now(),
      };
    }

    case "REMOVE_ITEM": {
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.itemId),
        selection: {
          ...state.selection,
          selectedItemIds: state.selection.selectedItemIds.filter(
            (id) => id !== action.itemId
          ),
          activeArtboardId:
            state.selection.activeArtboardId === action.itemId
              ? null
              : state.selection.activeArtboardId,
          selectedNodeId:
            state.selection.activeArtboardId === action.itemId
              ? null
              : state.selection.selectedNodeId,
        },
        updatedAt: now(),
      };
    }

    case "DUPLICATE_ITEM": {
      const original = state.items.find((item) => item.id === action.itemId);
      if (!original) return state;

      const maxZ = Math.max(0, ...state.items.map((item) => item.zIndex));
      const duplicate: CanvasItem = {
        ...structuredClone(original),
        id: uid(original.kind),
        x: original.x + 20,
        y: original.y + 20,
        zIndex: maxZ + 1,
      } as CanvasItem;

      return {
        ...state,
        items: [...state.items, duplicate],
        selection: {
          ...state.selection,
          selectedItemIds: [duplicate.id],
          activeArtboardId: null,
          selectedNodeId: null,
        },
        updatedAt: now(),
      };
    }

    case "UPDATE_ITEM": {
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.itemId
            ? ({ ...item, ...action.changes, id: item.id, kind: item.kind } as CanvasItem)
            : item
        ),
        updatedAt: now(),
      };
    }

    case "MOVE_ITEM": {
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.itemId
            ? { ...item, x: action.x, y: action.y }
            : item
        ),
        updatedAt: now(),
      };
    }

    case "REORDER_ITEM": {
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.itemId
            ? { ...item, zIndex: action.newZIndex }
            : item
        ),
        updatedAt: now(),
      };
    }

    // ── Artboard Node Editing ─────────────────────────────────────────────

    case "UPDATE_NODE": {
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.id !== action.artboardId) return item;
          return {
            ...item,
            pageTree: updateNodeInTree(item.pageTree, action.nodeId, (node) => ({
              ...node,
              ...action.changes,
              id: node.id,
              type: node.type,
            })),
          };
        }),
        updatedAt: now(),
      };
    }

    case "UPDATE_NODE_STYLE": {
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.id !== action.artboardId) return item;
          return {
            ...item,
            pageTree: updateNodeInTree(item.pageTree, action.nodeId, (node) => ({
              ...node,
              style: { ...node.style, ...action.style },
            })),
          };
        }),
        updatedAt: now(),
      };
    }

    // ── Selection ─────────────────────────────────────────────────────────

    case "SELECT_ITEM": {
      const ids = action.addToSelection
        ? state.selection.selectedItemIds.includes(action.itemId)
          ? state.selection.selectedItemIds.filter((id) => id !== action.itemId)
          : [...state.selection.selectedItemIds, action.itemId]
        : [action.itemId];

      return {
        ...state,
        selection: {
          selectedItemIds: ids,
          activeArtboardId: null,
          selectedNodeId: null,
        },
      };
    }

    case "SELECT_NODE": {
      return {
        ...state,
        selection: {
          selectedItemIds: [action.artboardId],
          activeArtboardId: action.artboardId,
          selectedNodeId: action.nodeId,
        },
      };
    }

    case "DESELECT_ALL": {
      return {
        ...state,
        selection: {
          selectedItemIds: [],
          activeArtboardId: null,
          selectedNodeId: null,
        },
      };
    }

    case "ESCAPE": {
      // Hierarchical: clear selectedNodeId first, then clear top-level selection
      if (state.selection.selectedNodeId) {
        return {
          ...state,
          selection: {
            ...state.selection,
            selectedNodeId: null,
          },
        };
      }
      return {
        ...state,
        selection: {
          selectedItemIds: [],
          activeArtboardId: null,
          selectedNodeId: null,
        },
      };
    }

    // ── Viewport ──────────────────────────────────────────────────────────

    case "SET_VIEWPORT": {
      return {
        ...state,
        viewport: { pan: action.pan, zoom: action.zoom },
      };
    }

    // ── History ───────────────────────────────────────────────────────────

    case "PUSH_HISTORY": {
      return {
        ...state,
        history: pushHistory(
          state.history,
          action.description,
          state.items,
          state.selection
        ),
      };
    }

    case "UNDO": {
      const result = undo(state.history, state.items, state.selection);
      if (!result) return state;
      return {
        ...state,
        items: result.items,
        selection: result.selection,
        history: result.stack,
        updatedAt: now(),
      };
    }

    case "REDO": {
      const result = redo(state.history, state.items, state.selection);
      if (!result) return state;
      return {
        ...state,
        items: result.items,
        selection: result.selection,
        history: result.stack,
        updatedAt: now(),
      };
    }

    // ── Prompt ────────────────────────────────────────────────────────────

    case "SET_PROMPT": {
      return {
        ...state,
        prompt: { ...state.prompt, value: action.value },
      };
    }

    case "SET_SITE_TYPE": {
      return {
        ...state,
        prompt: { ...state.prompt, siteType: action.siteType },
      };
    }

    case "TOGGLE_PROMPT_PANEL": {
      return {
        ...state,
        prompt: { ...state.prompt, isOpen: !state.prompt.isOpen },
      };
    }

    case "SET_SPLIT_RATIO": {
      return {
        ...state,
        prompt: { ...state.prompt, splitRatio: action.ratio },
      };
    }

    case "ADD_PROMPT_HISTORY": {
      return {
        ...state,
        prompt: {
          ...state.prompt,
          history: [...state.prompt.history, action.entry],
        },
      };
    }

    // ── Generation ────────────────────────────────────────────────────────

    case "REPLACE_SITE": {
      // Push history before replacing
      const historyAfterPush = pushHistory(
        state.history,
        "Generated site",
        state.items,
        state.selection
      );

      // Remove all existing artboard items, keep everything else
      const nonArtboards = state.items.filter((item) => item.kind !== "artboard");

      return {
        ...state,
        items: [...nonArtboards, ...action.artboards],
        prompt: {
          ...state.prompt,
          history: [...state.prompt.history, action.promptEntry],
        },
        selection: {
          selectedItemIds: [],
          activeArtboardId: null,
          selectedNodeId: null,
        },
        history: historyAfterPush,
        updatedAt: now(),
      };
    }

    // ── Persistence ───────────────────────────────────────────────────────

    case "LOAD_STATE": {
      return {
        ...action.state,
        history: state.history, // Preserve in-memory history stack across loads
      };
    }

    default:
      return state;
  }
}

// ─── Derived Queries ─────────────────────────────────────────────────────────

export function canUndoState(state: CanvasReducerState): boolean {
  return historyCanUndo(state.history);
}

export function canRedoState(state: CanvasReducerState): boolean {
  return historyCanRedo(state.history);
}
