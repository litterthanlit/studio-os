/**
 * V3 Canvas Reducer — useReducer-style state engine for the unified canvas.
 *
 * Handles all mutations, selection, viewport, history, prompt, and generation actions.
 * History is managed via the snapshot-based history engine (history.ts).
 */

import type { PageNode, PageNodeStyle, Breakpoint } from "./compose";
import type { DesignNode } from "./design-node";
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
  | { type: "UPDATE_TEXT_CONTENT_SITE"; artboardId: string; nodeId: string; text: string }
  | { type: "UPDATE_TEXT_STYLE_SITE"; artboardId: string; nodeId: string; style: Partial<PageNodeStyle> }
  | { type: "REORDER_NODE"; artboardId: string; nodeId: string; newIndex: number; parentNodeId?: string }
  | { type: "INSERT_SECTION"; artboardId: string; index?: number; section: import("./compose").PageNode }
  | { type: "DUPLICATE_SECTION"; artboardId: string; nodeId: string }
  | { type: "DELETE_SECTION"; artboardId: string; nodeId: string }
  | { type: "RESET_NODE_STYLE_OVERRIDE"; artboardId: string; nodeId: string; property: keyof PageNodeStyle; breakpoint: Breakpoint }
  | { type: "TOGGLE_NODE_HIDDEN"; artboardId: string; nodeId: string; breakpoint: Breakpoint }

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
  | { type: "SET_PROMPT_STATUS"; isGenerating?: boolean; agentSteps?: string[] }

  // Generation
  | { type: "REPLACE_SITE"; artboards: ArtboardItem[]; promptEntry: PromptRun }
  | { type: "RESTORE_SITE"; artboards: ArtboardItem[] }

  // AI Preview
  | { type: "START_AI_PREVIEW"; prompt: string; nodeId: string }
  | { type: "ACCEPT_AI_PREVIEW" }
  | { type: "RESTORE_AI_PREVIEW" }

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

// Tree node union — both PageNode and DesignNode share .id, .children, .type, .name
type TreeNode = PageNode | DesignNode;

function now(): string {
  return new Date().toISOString();
}

function isTextNodeType(type: PageNode["type"]): boolean {
  return type === "heading" || type === "paragraph" || type === "button";
}

/**
 * Recursively update a node within a PageNode tree by nodeId.
 */
function updateNodeInTree<T extends TreeNode>(
  node: T,
  nodeId: string,
  updater: (n: T) => T
): T {
  if (node.id === nodeId) return updater(node);
  if (!node.children) return node;

  const updatedChildren = node.children.map((child) =>
    updateNodeInTree(child as T, nodeId, updater)
  );

  // Only create a new object if a child actually changed
  if (updatedChildren.every((child, i) => child === node.children![i])) {
    return node;
  }

  return { ...node, children: updatedChildren } as T;
}

function reorderTopLevelSections(
  pageTree: TreeNode,
  nodeId: string,
  newIndex: number
): TreeNode | null {
  const children = pageTree.children ?? [];
  // PageNode trees: only reorder "section" type children
  // DesignNode trees: all top-level children are sections (frames)
  const isDesignTree = pageTree.type !== "page";
  const topLevelSections = isDesignTree ? children : children.filter((child) => child.type === "section");
  const currentIndex = topLevelSections.findIndex((child) => child.id === nodeId);

  if (
    currentIndex === -1 ||
    newIndex < 0 ||
    newIndex >= topLevelSections.length ||
    currentIndex === newIndex
  ) {
    return null;
  }

  const reorderedSections = [...topLevelSections];
  const [movedSection] = reorderedSections.splice(currentIndex, 1);
  reorderedSections.splice(newIndex, 0, movedSection);

  let sectionCursor = 0;
  const nextChildren = isDesignTree
    ? reorderedSections
    : children.map((child) =>
        child.type === "section" ? reorderedSections[sectionCursor++] : child
      );

  return {
    ...pageTree,
    children: nextChildren,
  };
}

function deepCloneWithNewIds<T extends TreeNode>(node: T): T {
  return {
    ...node,
    id: uid(node.type),
    children: node.children?.map((child) => deepCloneWithNewIds(child as T)),
  } as T;
}

function reorderWithinParent(
  pageTree: TreeNode,
  parentNodeId: string,
  nodeId: string,
  newIndex: number
): TreeNode | null {
  if (pageTree.id === parentNodeId) {
    const children = pageTree.children ?? [];
    const currentIndex = children.findIndex((c) => c.id === nodeId);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= children.length || currentIndex === newIndex) {
      return null;
    }
    const reordered = [...children];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(newIndex, 0, moved);
    return { ...pageTree, children: reordered } as TreeNode;
  }

  if (!pageTree.children) return null;

  for (let i = 0; i < pageTree.children.length; i++) {
    const result = reorderWithinParent(pageTree.children[i], parentNodeId, nodeId, newIndex);
    if (result) {
      const newChildren = [...pageTree.children];
      newChildren[i] = result;
      return { ...pageTree, children: newChildren } as TreeNode;
    }
  }
  return null;
}

function updateArtboardsForSite(
  items: CanvasItem[],
  artboardId: string,
  updater: (pageTree: TreeNode) => TreeNode
): CanvasItem[] | null {
  const sourceArtboard = items.find(
    (item): item is ArtboardItem =>
      item.kind === "artboard" && item.id === artboardId
  );

  if (!sourceArtboard) return null;

  return items.map((item) => {
    if (item.kind !== "artboard" || item.siteId !== sourceArtboard.siteId) {
      return item;
    }

    const nextPageTree = updater(item.pageTree);
    if (nextPageTree === item.pageTree) return item;
    return {
      ...item,
      pageTree: nextPageTree,
    };
  });
}

/**
 * Determine the active breakpoint from the currently active artboard.
 * Falls back to "desktop" when no artboard is active.
 */
function getActiveBreakpoint(state: UnifiedCanvasState): Breakpoint {
  if (!state.selection.activeArtboardId) return "desktop";
  const artboard = state.items.find(
    (item): item is ArtboardItem =>
      item.kind === "artboard" && item.id === state.selection.activeArtboardId
  );
  return artboard?.breakpoint ?? "desktop";
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

// Actions that should NOT auto-accept an active AI preview
const AI_PREVIEW_SAFE_ACTIONS = new Set([
  "START_AI_PREVIEW", "ACCEPT_AI_PREVIEW", "RESTORE_AI_PREVIEW",
  "SET_VIEWPORT", "LOAD_STATE", "UNDO", "REDO", "PUSH_HISTORY",
  "SET_PROMPT", "SET_SITE_TYPE", "TOGGLE_PROMPT_PANEL", "SET_SPLIT_RATIO",
  "SET_PROMPT_STATUS", "ADD_PROMPT_HISTORY", "REPLACE_SITE", "RESTORE_SITE",
]);

export function canvasReducer(
  state: CanvasReducerState,
  action: CanvasAction
): CanvasReducerState {
  // Auto-accept AI preview on user-initiated mutations or selection changes.
  // Preview-related, viewport, prompt, history, and generation actions are excluded.
  if (state.aiPreview && !AI_PREVIEW_SAFE_ACTIONS.has(action.type)) {
    state = { ...state, aiPreview: null };
  }

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
      const breakpoint = getActiveBreakpoint(state);
      const updater = (pageTree: PageNode) =>
        updateNodeInTree(pageTree, action.nodeId, (node) => {
          if (breakpoint === "desktop") {
            return { ...node, style: { ...node.style, ...action.style } };
          }
          return {
            ...node,
            responsiveOverrides: {
              ...node.responsiveOverrides,
              [breakpoint]: {
                ...node.responsiveOverrides?.[breakpoint],
                ...action.style,
              },
            },
          };
        });

      const nextItems = updateArtboardsForSite(state.items, action.artboardId, updater);

      return {
        ...state,
        items: nextItems ?? state.items,
        updatedAt: now(),
      };
    }

    case "UPDATE_TEXT_CONTENT_SITE": {
      const nextItems = updateArtboardsForSite(
        state.items,
        action.artboardId,
        (pageTree) =>
          updateNodeInTree(pageTree, action.nodeId, (node) => {
            if (!isTextNodeType(node.type)) return node;
            return {
              ...node,
              content: {
                ...node.content,
                text: action.text,
              },
            };
          })
      );

      if (!nextItems) return state;

      return {
        ...state,
        items: nextItems,
        updatedAt: now(),
      };
    }

    case "UPDATE_TEXT_STYLE_SITE": {
      const breakpoint = getActiveBreakpoint(state);
      const nextItems = updateArtboardsForSite(
        state.items,
        action.artboardId,
        (pageTree) =>
          updateNodeInTree(pageTree, action.nodeId, (node) => {
            if (!isTextNodeType(node.type)) return node;
            if (breakpoint === "desktop") {
              return {
                ...node,
                style: { ...node.style, ...action.style },
              };
            }
            return {
              ...node,
              responsiveOverrides: {
                ...node.responsiveOverrides,
                [breakpoint]: {
                  ...node.responsiveOverrides?.[breakpoint],
                  ...action.style,
                },
              },
            };
          })
      );

      if (!nextItems) return state;

      return {
        ...state,
        items: nextItems,
        updatedAt: now(),
      };
    }

    case "REORDER_NODE": {
      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.artboardId
      );

      if (!artboard) return state;

      const reorderedPageTree = action.parentNodeId
        ? reorderWithinParent(artboard.pageTree, action.parentNodeId, action.nodeId, action.newIndex)
        : reorderTopLevelSections(artboard.pageTree, action.nodeId, action.newIndex);

      if (!reorderedPageTree) return state;

      const historyAfterPush = pushHistory(
        state.history,
        "Reordered element",
        state.items,
        state.selection
      );

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) {
            return item;
          }

          if (item.id === artboard.id) {
            return {
              ...item,
              pageTree: reorderedPageTree,
            };
          }

          const synced = action.parentNodeId
            ? reorderWithinParent(item.pageTree, action.parentNodeId, action.nodeId, action.newIndex)
            : reorderTopLevelSections(item.pageTree, action.nodeId, action.newIndex);

          return synced ? { ...item, pageTree: synced } : item;
        }),
        history: historyAfterPush,
        updatedAt: now(),
      };
    }

    case "INSERT_SECTION": {
      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.artboardId
      );
      if (!artboard) return state;

      const insertIntoPageTree = (pageTree: TreeNode): TreeNode => {
        const children = pageTree.children ?? [];
        const next = [...children];
        const insertIndex =
          typeof action.index === "number"
            ? Math.max(0, Math.min(action.index, children.length))
            : children.length;
        next.splice(insertIndex, 0, action.section);
        return { ...pageTree, children: next };
      };

      const historyAfterInsert = pushHistory(
        state.history,
        `Added ${action.section.name} section`,
        state.items,
        state.selection
      );

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          return { ...item, pageTree: insertIntoPageTree(item.pageTree) };
        }),
        selection: {
          ...state.selection,
          selectedNodeId: action.section.id,
        },
        history: historyAfterInsert,
        updatedAt: now(),
      };
    }

    case "DUPLICATE_SECTION": {
      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.artboardId
      );
      if (!artboard) return state;

      const children = artboard.pageTree.children ?? [];
      const sourceIndex = children.findIndex((c) => c.id === action.nodeId);
      if (sourceIndex === -1) return state;

      const clone = deepCloneWithNewIds(children[sourceIndex]);

      const insertClone = (pageTree: TreeNode): TreeNode => {
        const ch = pageTree.children ?? [];
        const idx = ch.findIndex((c) => c.id === action.nodeId);
        if (idx === -1) return pageTree;
        const next = [...ch];
        next.splice(idx + 1, 0, clone);
        return { ...pageTree, children: next };
      };

      const historyAfterDup = pushHistory(
        state.history,
        "Duplicated section",
        state.items,
        state.selection
      );

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          return { ...item, pageTree: insertClone(item.pageTree) };
        }),
        selection: {
          ...state.selection,
          selectedNodeId: clone.id,
        },
        history: historyAfterDup,
        updatedAt: now(),
      };
    }

    case "DELETE_SECTION": {
      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.artboardId
      );
      if (!artboard) return state;

      const removeSection = (pageTree: TreeNode): TreeNode => {
        const ch = pageTree.children ?? [];
        const filtered = ch.filter((c) => c.id !== action.nodeId);
        if (filtered.length === ch.length) return pageTree;
        return { ...pageTree, children: filtered };
      };

      const historyAfterDel = pushHistory(
        state.history,
        "Removed section",
        state.items,
        state.selection
      );

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          return { ...item, pageTree: removeSection(item.pageTree) };
        }),
        selection: {
          ...state.selection,
          selectedNodeId: null,
        },
        history: historyAfterDel,
        updatedAt: now(),
      };
    }

    // ── Responsive Overrides ───────────────────────────────────────────────

    case "RESET_NODE_STYLE_OVERRIDE": {
      const { nodeId, property, breakpoint: bp } = action;

      const nextItems = updateArtboardsForSite(state.items, action.artboardId, (pageTree) =>
        updateNodeInTree(pageTree, nodeId, (node) => {
          const overridesForBp = node.responsiveOverrides?.[bp];
          if (!overridesForBp) return node;

          const updated = { ...overridesForBp };
          delete updated[property];

          const hasRemaining = Object.keys(updated).length > 0;
          const nextOverrides = { ...node.responsiveOverrides };
          if (hasRemaining) {
            nextOverrides[bp] = updated;
          } else {
            delete nextOverrides[bp];
          }

          return {
            ...node,
            responsiveOverrides: Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
          };
        })
      );

      if (!nextItems) return state;

      const historyAfterReset = pushHistory(
        state.history,
        "Reset responsive override",
        state.items,
        state.selection
      );

      return {
        ...state,
        items: nextItems,
        history: historyAfterReset,
        updatedAt: now(),
      };
    }

    case "TOGGLE_NODE_HIDDEN": {
      const { nodeId, breakpoint: bp } = action;

      const nextItems = updateArtboardsForSite(state.items, action.artboardId, (pageTree) =>
        updateNodeInTree(pageTree, nodeId, (node) => ({
          ...node,
          hidden: {
            ...node.hidden,
            [bp]: !(node.hidden?.[bp] ?? false),
          },
        }))
      );

      if (!nextItems) return state;

      const historyAfterToggle = pushHistory(
        state.history,
        "Toggle element visibility",
        state.items,
        state.selection
      );

      return {
        ...state,
        items: nextItems,
        history: historyAfterToggle,
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
      // Cmd+Z while AI preview is active → reject (restore pre-edit snapshot)
      if (state.aiPreview) {
        return {
          ...state,
          items: state.aiPreview.beforeItems,
          selection: state.aiPreview.beforeSelection,
          aiPreview: null,
          updatedAt: now(),
        };
      }
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

    case "SET_PROMPT_STATUS": {
      return {
        ...state,
        prompt: {
          ...state.prompt,
          ...(typeof action.isGenerating === "boolean"
            ? { isGenerating: action.isGenerating }
            : {}),
          ...(action.agentSteps ? { agentSteps: action.agentSteps } : {}),
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

    case "RESTORE_SITE": {
      const historyAfterPush = pushHistory(
        state.history,
        "Restored site",
        state.items,
        state.selection
      );

      const nonArtboards = state.items.filter((item) => item.kind !== "artboard");

      return {
        ...state,
        items: [...nonArtboards, ...action.artboards],
        selection: {
          selectedItemIds: [],
          activeArtboardId: null,
          selectedNodeId: null,
        },
        history: historyAfterPush,
        updatedAt: now(),
      };
    }

    // ── AI Preview ──────────────────────────────────────────────────────

    case "START_AI_PREVIEW": {
      return {
        ...state,
        aiPreview: {
          active: true,
          beforeItems: structuredClone(state.items),
          beforeSelection: { ...state.selection },
          prompt: action.prompt,
          targetNodeId: action.nodeId,
          timestamp: Date.now(),
        },
      };
    }

    case "ACCEPT_AI_PREVIEW": {
      return { ...state, aiPreview: null };
    }

    case "RESTORE_AI_PREVIEW": {
      if (!state.aiPreview) return state;
      return {
        ...state,
        items: state.aiPreview.beforeItems,
        selection: state.aiPreview.beforeSelection,
        aiPreview: null,
        updatedAt: now(),
      };
    }

    // ── Persistence ───────────────────────────────────────────────────────

    case "LOAD_STATE": {
      return {
        ...action.state,
        aiPreview: null, // Never restore transient AI preview state
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
