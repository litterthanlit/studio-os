/**
 * V3 Canvas Reducer — useReducer-style state engine for the unified canvas.
 *
 * Handles all mutations, selection, viewport, history, prompt, and generation actions.
 * History is managed via the snapshot-based history engine (history.ts).
 */

import type { PageNode, PageNodeStyle, Breakpoint } from "./compose";
import type { DesignNode } from "./design-node";
import {
  findDesignNodeById,
  findDesignNodeParent,
  walkDesignTree,
} from "./design-node";
import {
  findMaster, bakeInstance, filterAllowedOverrides, isInstanceChild,
} from "./component-resolver";
import { cloneDesignNodeWithIdMap } from "./design-node";
import { isBuiltinMasterId } from "./component-builtins";
import type {
  ComponentMaster, ComponentInstanceRef, NodeOverride,
} from "./design-node";
import type {
  UnifiedCanvasState,
  CanvasItem,
  ArtboardItem,
  PromptRun,
  MasterEditSession,
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
import {
  normalizeSelection,
  allAbsolute,
  allSameParent,
  getSelectionBounds,
  computeAlignment,
  computeDistribution,
  findLCA,
  getNodeDepth,
  type AlignDirection,
  type DistributeAxis,
} from "./multi-select-helpers";

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

  // Multi-select
  | { type: "TOGGLE_NODE_SELECTION"; artboardId: string; nodeId: string }
  | { type: "SET_SELECTED_NODES"; artboardId: string; nodeIds: string[] }
  | { type: "CLEAR_MULTI_SELECTION" }
  | { type: "ALIGN_NODES"; artboardId: string; direction: AlignDirection }
  | { type: "DISTRIBUTE_NODES"; artboardId: string; axis: DistributeAxis }
  | { type: "GROUP_NODES"; artboardId: string }
  | { type: "UNGROUP_NODES"; artboardId: string; nodeId: string }

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
  | { type: "SET_PROMPT_STATUS"; isGenerating?: boolean; agentSteps?: string[]; generationResult?: import("./unified-canvas-state").GenerationResult }

  // Generation
  | { type: "REPLACE_SITE"; artboards: ArtboardItem[]; promptEntry: PromptRun }
  | { type: "RESTORE_SITE"; artboards: ArtboardItem[] }

  // AI Preview
  | { type: "START_AI_PREVIEW"; prompt: string; nodeId: string }
  | { type: "ACCEPT_AI_PREVIEW" }
  | { type: "RESTORE_AI_PREVIEW" }

  // Component system (Track 3)
  | { type: "CREATE_MASTER"; artboardId: string; nodeId: string; name: string; category: string }
  | { type: "INSERT_INSTANCE"; artboardId: string; masterId: string; index?: number }
  | { type: "DETACH_INSTANCE"; artboardId: string; nodeId: string }
  | { type: "UPDATE_INSTANCE_OVERRIDE"; artboardId: string; instanceId: string; masterNodeId: string; override: NodeOverride }
  | { type: "RESET_INSTANCE_OVERRIDE_FIELD"; artboardId: string; instanceId: string; masterNodeId: string; category: "style" | "content" | "hidden" | "all"; field: string }
  | { type: "RESET_ALL_OVERRIDES"; artboardId: string; nodeId: string }
  | { type: "DELETE_MASTER"; masterId: string }
  | { type: "RENAME_MASTER"; masterId: string; name: string }

  // Built-in promotion (Track 3)
  | { type: "PROMOTE_BUILTIN_TO_USER"; artboardId: string; instanceNodeId: string }

  // Master edit mode (Track 3)
  | { type: "ENTER_MASTER_EDIT"; masterId: string }
  | { type: "UPDATE_MASTER_NODE"; masterId: string; nodeId: string; changes: Partial<DesignNode> }
  | { type: "UPDATE_MASTER_NODE_STYLE"; masterId: string; nodeId: string; style: Partial<import("./design-node").DesignNodeStyle> }
  | { type: "COMMIT_MASTER_EDIT" }
  | { type: "CANCEL_MASTER_EDIT" }

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
    masterEditSession: null,
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

/**
 * Replace a node in a DesignNode tree by ID, returning the replacement in its place.
 */
function replaceNodeInTree(tree: DesignNode, targetId: string, replacement: DesignNode): DesignNode {
  if (tree.id === targetId) return replacement;
  if (!tree.children) return tree;
  const newChildren = tree.children.map((child) => replaceNodeInTree(child, targetId, replacement));
  if (newChildren.every((c, i) => c === tree.children![i])) return tree;
  return { ...tree, children: newChildren };
}

function pushHistoryHelper(state: CanvasReducerState, description: string): CanvasReducerState {
  return {
    ...state,
    history: pushHistory(state.history, description, state.items, state.selection, state.components),
  };
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

  // Master edit mode guard — block most actions while editing a component master.
  // Only viewport, selection, undo/redo, and master-edit-specific actions pass through.
  if (state.masterEditSession) {
    const ALLOWED_DURING_MASTER_EDIT = new Set([
      "SET_VIEWPORT", "UNDO", "REDO", "PUSH_HISTORY",
      "SELECT_NODE", "DESELECT_ALL", "ESCAPE",
      "UPDATE_MASTER_NODE", "UPDATE_MASTER_NODE_STYLE",
      "COMMIT_MASTER_EDIT", "CANCEL_MASTER_EDIT",
      "ENTER_MASTER_EDIT",
    ]);
    if (!ALLOWED_DURING_MASTER_EDIT.has(action.type)) {
      return state;
    }
  }

  // Structural action guard: reject structural mutations on instance children
  const STRUCTURAL_ACTIONS = new Set([
    "DELETE_SECTION", "REORDER_NODE", "INSERT_SECTION",
    "GROUP_NODES", "UNGROUP_NODES", "DUPLICATE_SECTION",
  ]);

  if (STRUCTURAL_ACTIONS.has(action.type)) {
    const nodeId = (action as { nodeId?: string }).nodeId;
    if (nodeId && isInstanceChild(nodeId)) {
      // CEO flag: Delete key on instance children must be a no-op.
      // The keyboard handler dispatches DELETE_SECTION with selectedNodeId.
      // If selectedNodeId is a composite ID (contains "::"), reject here.
      return state;
    }
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
      const clearNodes = state.selection.activeArtboardId === action.itemId;
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.itemId),
        selection: {
          ...state.selection,
          selectedItemIds: state.selection.selectedItemIds.filter(
            (id) => id !== action.itemId
          ),
          activeArtboardId: clearNodes ? null : state.selection.activeArtboardId,
          selectedNodeId: clearNodes ? null : state.selection.selectedNodeId,
          selectedNodeIds: clearNodes ? [] : state.selection.selectedNodeIds,
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
          selectedNodeIds: [],
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
        state.selection,
        state.components
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
        state.selection,
        state.components
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
          selectedNodeIds: [action.section.id],
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

      // When multi-select is active, duplicate all normalized selected nodes
      const idsToDuplicate = state.selection.selectedNodeIds.length > 1
        ? normalizeSelection(
            state.selection.selectedNodeIds,
            artboard.pageTree as DesignNode
          )
        : [action.nodeId];

      const children = artboard.pageTree.children ?? [];
      const clones: Array<{ sourceId: string; clone: TreeNode }> = [];

      for (const id of idsToDuplicate) {
        const sourceIndex = children.findIndex((c) => c.id === id);
        if (sourceIndex === -1) continue;
        const sourceNode = children[sourceIndex] as DesignNode;
        if (sourceNode.componentRef) {
          // Duplicate an instance root → fresh instance with empty overrides
          const newInstance: TreeNode = {
            ...sourceNode,
            id: uid(sourceNode.type),
            componentRef: {
              masterId: sourceNode.componentRef.masterId,
              masterVersion: sourceNode.componentRef.masterVersion,
              overrides: {},
            },
            children: undefined, // resolved tree will be rebuilt by resolveTree
          };
          clones.push({ sourceId: id, clone: newInstance });
        } else {
          clones.push({ sourceId: id, clone: deepCloneWithNewIds(children[sourceIndex]) });
        }
      }

      if (clones.length === 0) return state;

      const insertClones = (pageTree: TreeNode): TreeNode => {
        const ch = pageTree.children ?? [];
        const next: TreeNode[] = [];
        for (const child of ch) {
          next.push(child);
          const cloneEntry = clones.find((c) => c.sourceId === child.id);
          if (cloneEntry) {
            next.push(cloneEntry.clone);
          }
        }
        return { ...pageTree, children: next };
      };

      const historyAfterDup = pushHistory(
        state.history,
        "Duplicated section",
        state.items,
        state.selection,
        state.components
      );

      const cloneIds = clones.map((c) => c.clone.id);

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          return { ...item, pageTree: insertClones(item.pageTree) };
        }),
        selection: {
          ...state.selection,
          selectedNodeId: cloneIds[0],
          selectedNodeIds: cloneIds,
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

      // When multi-select is active, delete all normalized selected nodes
      const idsToDelete = state.selection.selectedNodeIds.length > 1
        ? normalizeSelection(
            state.selection.selectedNodeIds,
            artboard.pageTree as DesignNode
          )
        : [action.nodeId];

      const deleteSet = new Set(idsToDelete);

      const removeSections = (pageTree: TreeNode): TreeNode => {
        const ch = pageTree.children ?? [];
        const filtered = ch.filter((c) => !deleteSet.has(c.id));
        if (filtered.length === ch.length) return pageTree;
        return { ...pageTree, children: filtered };
      };

      const historyAfterDel = pushHistory(
        state.history,
        "Removed section",
        state.items,
        state.selection,
        state.components
      );

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          return { ...item, pageTree: removeSections(item.pageTree) };
        }),
        selection: {
          ...state.selection,
          selectedNodeId: null,
          selectedNodeIds: [],
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
        state.selection,
        state.components
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
        state.selection,
        state.components
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
          selectedNodeIds: [],
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
          selectedNodeIds: [action.nodeId],
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
          selectedNodeIds: [],
        },
      };
    }

    case "ESCAPE": {
      // If multi-select is active, collapse to primary only first
      if (state.selection.selectedNodeIds.length > 1) {
        return {
          ...state,
          selection: {
            ...state.selection,
            selectedNodeIds: state.selection.selectedNodeId
              ? [state.selection.selectedNodeId]
              : [],
          },
        };
      }
      // Hierarchical: clear selectedNodeId first, then clear top-level selection
      if (state.selection.selectedNodeId) {
        return {
          ...state,
          selection: {
            ...state.selection,
            selectedNodeId: null,
            selectedNodeIds: [],
          },
        };
      }
      return {
        ...state,
        selection: {
          selectedItemIds: [],
          activeArtboardId: null,
          selectedNodeId: null,
          selectedNodeIds: [],
        },
      };
    }

    // ── Multi-Select ────────────────────────────────────────────────────

    case "TOGGLE_NODE_SELECTION": {
      const currentIds = state.selection.selectedNodeIds;
      const nodeId = action.nodeId;
      const isInSet = currentIds.includes(nodeId);

      if (isInSet) {
        // Remove from set
        const remaining = currentIds.filter((id) => id !== nodeId);
        if (remaining.length === 0) {
          // Last node removed → deselect all
          return {
            ...state,
            selection: {
              selectedItemIds: [],
              activeArtboardId: null,
              selectedNodeId: null,
              selectedNodeIds: [],
            },
          };
        }
        // If primary was removed, promote last remaining node
        const newPrimary =
          state.selection.selectedNodeId === nodeId
            ? remaining[remaining.length - 1]
            : state.selection.selectedNodeId;
        return {
          ...state,
          selection: {
            ...state.selection,
            activeArtboardId: action.artboardId,
            selectedNodeId: newPrimary,
            selectedNodeIds: remaining,
          },
        };
      } else {
        // Add to set and make primary
        return {
          ...state,
          selection: {
            ...state.selection,
            selectedItemIds: [action.artboardId],
            activeArtboardId: action.artboardId,
            selectedNodeId: nodeId,
            selectedNodeIds: [...currentIds, nodeId],
          },
        };
      }
    }

    case "SET_SELECTED_NODES": {
      if (action.nodeIds.length === 0) {
        return {
          ...state,
          selection: {
            selectedItemIds: [],
            activeArtboardId: null,
            selectedNodeId: null,
            selectedNodeIds: [],
          },
        };
      }
      return {
        ...state,
        selection: {
          selectedItemIds: [action.artboardId],
          activeArtboardId: action.artboardId,
          selectedNodeId: action.nodeIds[0],
          selectedNodeIds: action.nodeIds,
        },
      };
    }

    case "CLEAR_MULTI_SELECTION": {
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedNodeIds: state.selection.selectedNodeId
            ? [state.selection.selectedNodeId]
            : [],
        },
      };
    }

    case "ALIGN_NODES": {
      const alignArtboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.artboardId
      );
      if (!alignArtboard) return state;

      const tree = alignArtboard.pageTree as DesignNode;
      const normalized = normalizeSelection(state.selection.selectedNodeIds, tree);
      if (normalized.length < 2) return state;
      if (!allAbsolute(normalized, tree)) return state;

      const positions = computeAlignment(normalized, tree, action.direction);
      if (positions.size === 0) return state;

      const historyAfterAlign = pushHistory(
        state.history,
        `Aligned nodes ${action.direction}`,
        state.items,
        state.selection,
        state.components
      );

      const applyPositions = (pageTree: TreeNode): TreeNode => {
        let result = pageTree;
        for (const [nodeId, pos] of positions) {
          result = updateNodeInTree(result, nodeId, (node) => ({
            ...node,
            style: { ...node.style, x: pos.x, y: pos.y },
          }));
        }
        return result;
      };

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== alignArtboard.siteId) return item;
          return { ...item, pageTree: applyPositions(item.pageTree) };
        }),
        history: historyAfterAlign,
        updatedAt: now(),
      };
    }

    case "DISTRIBUTE_NODES": {
      const distArtboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.artboardId
      );
      if (!distArtboard) return state;

      const distTree = distArtboard.pageTree as DesignNode;
      const distNormalized = normalizeSelection(state.selection.selectedNodeIds, distTree);
      if (distNormalized.length < 3) return state;
      if (!allAbsolute(distNormalized, distTree)) return state;

      const distPositions = computeDistribution(distNormalized, distTree, action.axis);
      if (distPositions.size === 0) return state;

      const historyAfterDist = pushHistory(
        state.history,
        `Distributed nodes ${action.axis}`,
        state.items,
        state.selection,
        state.components
      );

      const applyDistPositions = (pageTree: TreeNode): TreeNode => {
        let result = pageTree;
        for (const [nodeId, pos] of distPositions) {
          result = updateNodeInTree(result, nodeId, (node) => ({
            ...node,
            style: { ...node.style, x: pos.x, y: pos.y },
          }));
        }
        return result;
      };

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== distArtboard.siteId) return item;
          return { ...item, pageTree: applyDistPositions(item.pageTree) };
        }),
        history: historyAfterDist,
        updatedAt: now(),
      };
    }

    case "GROUP_NODES": {
      const groupArtboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.artboardId
      );
      if (!groupArtboard) return state;

      const groupTree = groupArtboard.pageTree as DesignNode;
      const groupNormalized = normalizeSelection(state.selection.selectedNodeIds, groupTree);
      if (groupNormalized.length < 2) return state;
      if (!allAbsolute(groupNormalized, groupTree)) return state;

      // Compute bounding box
      const bounds = getSelectionBounds(groupNormalized, groupTree);
      if (!bounds) return state;

      // Determine parent — prefer same-parent, fall back to LCA
      let parent = allSameParent(groupNormalized, groupTree);
      if (!parent) {
        parent = findLCA(groupNormalized, groupTree);
        if (!parent) return state;

        // Bail out if LCA is more than 2 levels above any selected node
        for (const nodeId of groupNormalized) {
          const nodeDepth = getNodeDepth(nodeId, groupTree);
          const parentDepth = getNodeDepth(parent.id, groupTree);
          if (nodeDepth === -1 || parentDepth === -1) return state;
          if (nodeDepth - parentDepth > 2) return state;
        }
      }

      // Create group frame
      const groupId = uid("frame");
      const groupNode: DesignNode = {
        id: groupId,
        type: "frame",
        name: "Group",
        isGroup: true,
        style: {
          position: "absolute",
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          background: "transparent",
        },
        children: [],
      };

      // Collect children and recalculate positions relative to group origin
      const selectedSet = new Set(groupNormalized);
      const groupChildren: DesignNode[] = [];
      for (const nodeId of groupNormalized) {
        const node = findDesignNodeById(groupTree, nodeId);
        if (!node) continue;
        groupChildren.push({
          ...node,
          style: {
            ...node.style,
            x: (node.style.x ?? 0) - bounds.x,
            y: (node.style.y ?? 0) - bounds.y,
          },
        });
      }
      groupNode.children = groupChildren;

      // Find the topmost z-position among selected nodes in the parent's children
      const parentChildren = parent.children ?? [];
      let topmostIndex = -1;
      for (let i = 0; i < parentChildren.length; i++) {
        if (selectedSet.has(parentChildren[i].id)) {
          if (topmostIndex === -1 || i < topmostIndex) {
            topmostIndex = i;
          }
        }
      }

      // Build new parent children: remove selected, insert group at topmost position
      const applyGroup = (pageTree: TreeNode): TreeNode => {
        return updateNodeInTree(pageTree, parent!.id, (parentNode) => {
          const ch = parentNode.children ?? [];
          const withoutSelected = ch.filter((c) => !selectedSet.has(c.id));
          // Find the first selected child's original index, then count
          // how many non-selected children precede it — that count is the
          // correct insertion index in the filtered (withoutSelected) array.
          let insertIdx = withoutSelected.length; // fallback: append
          const firstSelectedOrigIdx = ch.findIndex((c) => selectedSet.has(c.id));
          if (firstSelectedOrigIdx !== -1) {
            let nonSelectedBefore = 0;
            for (let i = 0; i < firstSelectedOrigIdx; i++) {
              if (!selectedSet.has(ch[i].id)) nonSelectedBefore++;
            }
            insertIdx = nonSelectedBefore;
          }
          const next = [...withoutSelected];
          next.splice(insertIdx, 0, groupNode as unknown as typeof ch[0]);
          return { ...parentNode, children: next };
        });
      };

      const historyAfterGroup = pushHistory(
        state.history,
        "Grouped nodes",
        state.items,
        state.selection,
        state.components
      );

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== groupArtboard.siteId) return item;
          return { ...item, pageTree: applyGroup(item.pageTree) };
        }),
        selection: {
          ...state.selection,
          selectedNodeId: groupId,
          selectedNodeIds: [groupId],
        },
        history: historyAfterGroup,
        updatedAt: now(),
      };
    }

    case "UNGROUP_NODES": {
      const ungroupArtboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.artboardId
      );
      if (!ungroupArtboard) return state;

      const ungroupTree = ungroupArtboard.pageTree as DesignNode;
      const groupToUngroup = findDesignNodeById(ungroupTree, action.nodeId);
      if (!groupToUngroup) return state;
      if (groupToUngroup.isGroup !== true) return state;

      const groupParent = findDesignNodeParent(ungroupTree, action.nodeId);
      if (!groupParent) return state;

      const groupX = groupToUngroup.style.x ?? 0;
      const groupY = groupToUngroup.style.y ?? 0;

      // Recalculate child positions (add group's x/y)
      const promotedChildren: DesignNode[] = (groupToUngroup.children ?? []).map(
        (child) => ({
          ...child,
          style: {
            ...child.style,
            x: (child.style.x ?? 0) + groupX,
            y: (child.style.y ?? 0) + groupY,
          },
        })
      );

      const promotedChildIds = promotedChildren.map((c) => c.id);

      const applyUngroup = (pageTree: TreeNode): TreeNode => {
        return updateNodeInTree(pageTree, groupParent.id, (parentNode) => {
          const ch = parentNode.children ?? [];
          const groupIndex = ch.findIndex((c) => c.id === action.nodeId);
          if (groupIndex === -1) return parentNode;
          const next = [...ch];
          // Replace group with its children at the same position
          next.splice(groupIndex, 1, ...(promotedChildren as unknown as typeof ch));
          return { ...parentNode, children: next };
        });
      };

      const historyAfterUngroup = pushHistory(
        state.history,
        "Ungrouped nodes",
        state.items,
        state.selection,
        state.components
      );

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== ungroupArtboard.siteId) return item;
          return { ...item, pageTree: applyUngroup(item.pageTree) };
        }),
        selection: {
          ...state.selection,
          selectedNodeId: promotedChildIds[0] ?? null,
          selectedNodeIds: promotedChildIds,
        },
        history: historyAfterUngroup,
        updatedAt: now(),
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
          state.selection,
          state.components
        ),
      };
    }

    case "UNDO": {
      // Cmd+Z while AI preview is active → reject (restore pre-edit snapshot)
      if (state.aiPreview) {
        const restoredSel = state.aiPreview.beforeSelection;
        return {
          ...state,
          items: state.aiPreview.beforeItems,
          selection: {
            ...restoredSel,
            selectedNodeIds: restoredSel.selectedNodeIds ?? [],
          },
          aiPreview: null,
          updatedAt: now(),
        };
      }
      const result = undo(state.history, state.items, state.selection, state.components);
      if (!result) return state;

      // Master edit mode boundary check — cannot undo past session start
      if (state.masterEditSession) {
        const boundary = state.masterEditSession.historyBoundaryIndex;
        if (result.stack.cursor < boundary) return state;
      }

      return {
        ...state,
        items: result.items,
        selection: {
          ...result.selection,
          selectedNodeIds: result.selection.selectedNodeIds ?? [],
        },
        history: result.stack,
        components: result.components,
        updatedAt: now(),
      };
    }

    case "REDO": {
      const result = redo(state.history, state.items, state.selection, state.components);
      if (!result) return state;
      return {
        ...state,
        items: result.items,
        selection: {
          ...result.selection,
          selectedNodeIds: result.selection.selectedNodeIds ?? [],
        },
        history: result.stack,
        components: result.components,
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
          ...(action.generationResult !== undefined
            ? { generationResult: action.generationResult }
            : {}),
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
        state.selection,
        state.components
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
          selectedNodeIds: [],
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
        state.selection,
        state.components
      );

      const nonArtboards = state.items.filter((item) => item.kind !== "artboard");

      return {
        ...state,
        items: [...nonArtboards, ...action.artboards],
        selection: {
          selectedItemIds: [],
          activeArtboardId: null,
          selectedNodeId: null,
          selectedNodeIds: [],
        },
        history: historyAfterPush,
        updatedAt: now(),
      };
    }

    // ── Component System (Track 3) ─────────────────────────────────────

    case "CREATE_MASTER": {
      const { artboardId, nodeId, name, category } = action;
      const stateH = pushHistoryHelper(state, "Create component");

      const artboard = stateH.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === artboardId
      );
      if (!artboard) return stateH;
      const tree = artboard.pageTree as DesignNode;
      const sourceNode = findDesignNodeById(tree, nodeId);
      if (!sourceNode) return stateH;

      const master: ComponentMaster = {
        id: `comp-${Math.random().toString(36).slice(2, 10)}`,
        name,
        category,
        source: "user",
        tree: JSON.parse(JSON.stringify(sourceNode)),
        version: 1,
        createdAt: now(),
        updatedAt: now(),
      };

      const instanceRef: ComponentInstanceRef = {
        masterId: master.id,
        masterVersion: 1,
        overrides: {},
      };

      const newTree = updateNodeInTree(tree, nodeId, (n) => ({
        ...n,
        componentRef: instanceRef,
        children: undefined,
      }));

      return {
        ...stateH,
        items: stateH.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          if (item.id === artboardId) return { ...item, pageTree: newTree };
          return {
            ...item,
            pageTree: updateNodeInTree(item.pageTree as DesignNode, nodeId, (n) => ({
              ...n,
              componentRef: instanceRef,
              children: undefined,
            })),
          };
        }),
        components: [...stateH.components, master],
        updatedAt: now(),
      };
    }

    case "INSERT_INSTANCE": {
      const { artboardId, masterId, index } = action;
      const stateH = pushHistoryHelper(state, "Insert component");

      const master = findMaster(stateH.components, masterId);
      if (!master) return stateH;

      const artboard = stateH.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === artboardId
      );
      if (!artboard) return stateH;

      const instanceNode: DesignNode = {
        id: uid("frame"),
        type: "frame",
        name: master.name,
        style: { width: "fill" as const },
        componentRef: {
          masterId,
          masterVersion: master.version,
          overrides: {},
        },
      };

      const insertIndex = index ?? ((artboard.pageTree as DesignNode).children?.length ?? 0);

      return {
        ...stateH,
        items: stateH.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          const tree = item.pageTree as DesignNode;
          const children = [...(tree.children ?? [])];
          const inst: DesignNode = item.id === artboardId
            ? instanceNode
            : { ...instanceNode, id: uid("frame") };
          children.splice(insertIndex, 0, inst);
          return { ...item, pageTree: { ...tree, children } };
        }),
        updatedAt: now(),
      };
    }

    case "DETACH_INSTANCE": {
      const { artboardId, nodeId } = action;
      const stateH = pushHistoryHelper(state, "Detach component");

      const artboard = stateH.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === artboardId
      );
      if (!artboard) return stateH;
      const tree = artboard.pageTree as DesignNode;
      const instanceNode = findDesignNodeById(tree, nodeId);
      if (!instanceNode?.componentRef) return stateH;

      const master = findMaster(stateH.components, instanceNode.componentRef.masterId);
      if (!master) return stateH;

      const baked = bakeInstance(instanceNode, master);
      const newTree = replaceNodeInTree(tree, nodeId, baked);

      return {
        ...stateH,
        items: stateH.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          if (item.id === artboardId) return { ...item, pageTree: newTree };
          // For other artboards in same site, detach same-master instances
          const otherTree = item.pageTree as DesignNode;
          let otherInstance: DesignNode | null = null;
          walkDesignTree(otherTree, (n) => {
            if (n.componentRef?.masterId === instanceNode.componentRef!.masterId) otherInstance = n;
          });
          if (otherInstance) {
            const otherBaked = bakeInstance(otherInstance, master);
            return { ...item, pageTree: replaceNodeInTree(otherTree, (otherInstance as DesignNode).id, otherBaked) };
          }
          return item;
        }),
        updatedAt: now(),
      };
    }

    case "UPDATE_INSTANCE_OVERRIDE": {
      const { artboardId, instanceId, masterNodeId, override } = action;
      const filtered = filterAllowedOverrides(override);
      if (!filtered.style && !filtered.content && !filtered.hidden) return state;

      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === artboardId
      );
      if (!artboard) return state;
      const tree = artboard.pageTree as DesignNode;
      const instanceNode = findDesignNodeById(tree, instanceId);
      if (!instanceNode?.componentRef) return state;

      const existing = instanceNode.componentRef.overrides[masterNodeId] ?? {};
      const merged: NodeOverride = {
        style: filtered.style ? { ...existing.style, ...filtered.style } : existing.style,
        content: filtered.content ? { ...existing.content, ...filtered.content } : existing.content,
        hidden: filtered.hidden ? { ...existing.hidden, ...filtered.hidden } : existing.hidden,
      };

      if (merged.style && Object.keys(merged.style).length === 0) delete merged.style;
      if (merged.content && Object.keys(merged.content).length === 0) delete merged.content;
      if (merged.hidden && Object.keys(merged.hidden).length === 0) delete merged.hidden;

      const newOverrides = { ...instanceNode.componentRef.overrides };
      if (!merged.style && !merged.content && !merged.hidden) {
        delete newOverrides[masterNodeId];
      } else {
        newOverrides[masterNodeId] = merged;
      }

      const newTree = updateNodeInTree(tree, instanceId, (n) => ({
        ...n,
        componentRef: { ...n.componentRef!, overrides: newOverrides },
      }));

      const nextItems = updateArtboardsForSite(state.items, artboardId, (pageTree) => {
        if (pageTree === artboard.pageTree) return newTree;
        return pageTree;
      });

      return {
        ...state,
        items: nextItems ?? state.items,
        updatedAt: now(),
      };
    }

    case "RESET_INSTANCE_OVERRIDE_FIELD": {
      const { artboardId, instanceId, masterNodeId, category, field } = action;
      const stateH = pushHistoryHelper(state, "Reset override");

      const artboard = stateH.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === artboardId
      );
      if (!artboard) return stateH;
      const tree = artboard.pageTree as DesignNode;
      const instanceNode = findDesignNodeById(tree, instanceId);
      if (!instanceNode?.componentRef) return stateH;

      const newOverrides = { ...instanceNode.componentRef.overrides };

      if (category === "all") {
        delete newOverrides[masterNodeId];
      } else {
        const entry = newOverrides[masterNodeId];
        if (!entry) return stateH;
        const newEntry = { ...entry };

        if (category === "style" && newEntry.style) {
          const s = { ...newEntry.style } as Record<string, unknown>;
          delete s[field];
          newEntry.style = Object.keys(s).length > 0 ? s as NodeOverride["style"] : undefined;
        } else if (category === "content" && newEntry.content) {
          const c = { ...newEntry.content } as Record<string, unknown>;
          delete c[field];
          newEntry.content = Object.keys(c).length > 0 ? c as NodeOverride["content"] : undefined;
        } else if (category === "hidden" && newEntry.hidden) {
          const h = { ...newEntry.hidden } as Record<string, unknown>;
          delete h[field];
          newEntry.hidden = Object.keys(h).length > 0 ? h as NodeOverride["hidden"] : undefined;
        }

        if (!newEntry.style && !newEntry.content && !newEntry.hidden) {
          delete newOverrides[masterNodeId];
        } else {
          newOverrides[masterNodeId] = newEntry;
        }
      }

      const newTree = updateNodeInTree(tree, instanceId, (n) => ({
        ...n,
        componentRef: { ...n.componentRef!, overrides: newOverrides },
      }));

      const nextItems = updateArtboardsForSite(stateH.items, artboardId, (pageTree) => {
        if (pageTree === artboard.pageTree) return newTree;
        return pageTree;
      });

      return {
        ...stateH,
        items: nextItems ?? stateH.items,
        updatedAt: now(),
      };
    }

    case "RESET_ALL_OVERRIDES": {
      const { artboardId, nodeId } = action;
      const stateH = pushHistoryHelper(state, "Reset all overrides");

      const nextItems = updateArtboardsForSite(stateH.items, artboardId, (pageTree) =>
        updateNodeInTree(pageTree as DesignNode, nodeId, (n) => ({
          ...n,
          componentRef: n.componentRef ? { ...n.componentRef, overrides: {} } : n.componentRef,
        }))
      );

      return {
        ...stateH,
        items: nextItems ?? stateH.items,
        updatedAt: now(),
      };
    }

    case "DELETE_MASTER": {
      const { masterId } = action;
      const master = findMaster(state.components, masterId);
      if (!master || master.source === "builtin") return state;

      const stateH = pushHistoryHelper(state, "Delete component");

      const updatedItems = stateH.items.map((item) => {
        if (item.kind !== "artboard") return item;
        const tree = item.pageTree as DesignNode;
        let modified = false;
        let newTree = tree;

        walkDesignTree(tree, (node) => {
          if (node.componentRef?.masterId === masterId) {
            const baked = bakeInstance(node, master);
            newTree = replaceNodeInTree(newTree, node.id, baked);
            modified = true;
          }
        });

        if (modified) return { ...item, pageTree: newTree };
        return item;
      });

      return {
        ...stateH,
        items: updatedItems,
        components: stateH.components.filter((c) => c.id !== masterId),
        updatedAt: now(),
      };
    }

    case "RENAME_MASTER": {
      const { masterId, name } = action;
      const stateH = pushHistoryHelper(state, "Rename component");
      return {
        ...stateH,
        components: stateH.components.map((c) =>
          c.id === masterId ? { ...c, name, updatedAt: now() } : c
        ),
        updatedAt: now(),
      };
    }

    // ── Built-in Promotion (Track 3) ────────────────────────────────────

    case "PROMOTE_BUILTIN_TO_USER": {
      const { artboardId, instanceNodeId } = action;
      const stateWithHistory = pushHistoryHelper(state, "Create editable copy");

      // Find the artboard and instance node
      const artboard = stateWithHistory.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === artboardId
      );
      if (!artboard) return stateWithHistory;

      const instanceNode = findDesignNodeById(
        artboard.pageTree as DesignNode,
        instanceNodeId
      );
      if (!instanceNode?.componentRef) return stateWithHistory;

      const builtinMaster = findMaster(stateWithHistory.components, instanceNode.componentRef.masterId);
      if (!builtinMaster) return stateWithHistory;

      // Clone the built-in master tree with new IDs
      const { tree: userTree, idMap } = cloneDesignNodeWithIdMap(
        builtinMaster.tree,
        (originalId) => uid(originalId.split("-")[0] || "node")
      );

      const userMasterId = uid("comp");
      const timestamp = now();
      const userMaster: ComponentMaster = {
        id: userMasterId,
        name: `${builtinMaster.name} (Custom)`,
        category: builtinMaster.category,
        source: "user",
        tree: userTree,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Re-key overrides using idMap
      const remappedOverrides: Record<string, import("./design-node").NodeOverride> = {};
      for (const [oldId, override] of Object.entries(instanceNode.componentRef.overrides)) {
        const newId = idMap[oldId];
        if (newId) remappedOverrides[newId] = override;
      }

      // Update instance node's componentRef to point to new user master
      const updatedItems = stateWithHistory.items.map((item) => {
        if (item.kind !== "artboard" || item.id !== artboardId) return item;
        return {
          ...item,
          pageTree: updateNodeInTree(item.pageTree as DesignNode, instanceNodeId, (n) => ({
            ...n,
            componentRef: {
              ...n.componentRef!,
              masterId: userMasterId,
              masterVersion: 1,
              overrides: remappedOverrides,
            },
          })),
        };
      }) as CanvasItem[];

      // Add user master to components and enter master edit mode
      const updatedComponents = [...stateWithHistory.components, userMaster];

      return {
        ...stateWithHistory,
        items: updatedItems,
        components: updatedComponents,
        masterEditSession: {
          masterId: userMasterId,
          snapshotTree: JSON.parse(JSON.stringify(userTree)),
          historyBoundaryIndex: stateWithHistory.history.cursor,
          dirty: false,
        },
        updatedAt: timestamp,
      };
    }

    // ── Master Edit Mode (Track 3) ──────────────────────────────────────

    case "ENTER_MASTER_EDIT": {
      const { masterId } = action;
      if (state.masterEditSession) return state; // already editing

      const master = state.components.find((c) => c.id === masterId);
      if (!master) return state;

      const stateWithHistory = pushHistoryHelper(state, "Enter master edit");

      return {
        ...stateWithHistory,
        masterEditSession: {
          masterId,
          snapshotTree: JSON.parse(JSON.stringify(master.tree)),
          historyBoundaryIndex: stateWithHistory.history.cursor,
          dirty: false,
        },
      };
    }

    case "UPDATE_MASTER_NODE": {
      if (!state.masterEditSession || state.masterEditSession.masterId !== action.masterId) return state;

      const updatedComponents = state.components.map((c) => {
        if (c.id !== action.masterId) return c;
        const updatedTree = updateNodeInTree(c.tree, action.nodeId, (n) => ({
          ...n,
          ...action.changes,
        }));
        return { ...c, tree: updatedTree };
      });

      return {
        ...state,
        components: updatedComponents,
        masterEditSession: { ...state.masterEditSession, dirty: true },
      };
    }

    case "UPDATE_MASTER_NODE_STYLE": {
      if (!state.masterEditSession || state.masterEditSession.masterId !== action.masterId) return state;

      const updatedComponents = state.components.map((c) => {
        if (c.id !== action.masterId) return c;
        const updatedTree = updateNodeInTree(c.tree, action.nodeId, (n) => ({
          ...n,
          style: { ...n.style, ...action.style },
        }));
        return { ...c, tree: updatedTree };
      });

      return {
        ...state,
        components: updatedComponents,
        masterEditSession: { ...state.masterEditSession, dirty: true },
      };
    }

    case "COMMIT_MASTER_EDIT": {
      if (!state.masterEditSession) return state;
      const stateWithHistory = pushHistoryHelper(state, "Commit master edit");

      const updatedComponents = stateWithHistory.components.map((c) => {
        if (c.id !== stateWithHistory.masterEditSession!.masterId) return c;
        return {
          ...c,
          version: c.version + 1,
          updatedAt: now(),
        };
      });

      return {
        ...stateWithHistory,
        components: updatedComponents,
        masterEditSession: null,
      };
    }

    case "CANCEL_MASTER_EDIT": {
      if (!state.masterEditSession) return state;
      const { masterId, snapshotTree, historyBoundaryIndex } = state.masterEditSession;

      const restoredComponents = state.components.map((c) => {
        if (c.id !== masterId) return c;
        return { ...c, tree: snapshotTree };
      });

      // Rewind history to boundary
      const rewoundHistory: HistoryStack = {
        ...state.history,
        entries: state.history.entries.slice(0, historyBoundaryIndex + 1),
        cursor: Math.min(state.history.cursor, historyBoundaryIndex),
      };

      return {
        ...state,
        components: restoredComponents,
        history: rewoundHistory,
        masterEditSession: null,
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
        selection: {
          ...state.aiPreview.beforeSelection,
          selectedNodeIds: state.aiPreview.beforeSelection.selectedNodeIds ?? [],
        },
        aiPreview: null,
        updatedAt: now(),
      };
    }

    // ── Persistence ───────────────────────────────────────────────────────

    case "LOAD_STATE": {
      return {
        ...action.state,
        selection: {
          ...action.state.selection,
          selectedNodeIds: action.state.selection.selectedNodeIds ?? [],
        },
        aiPreview: null, // Never restore transient AI preview state
        history: state.history, // Preserve in-memory history stack across loads
        masterEditSession: null, // Never restore transient master edit state
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
