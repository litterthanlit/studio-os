/**
 * V3 Canvas Reducer — useReducer-style state engine for the unified canvas.
 *
 * Handles all mutations, selection, viewport, history, prompt, and generation actions.
 * History is managed via the snapshot-based history engine (history.ts).
 */

import type { PageNode, Breakpoint } from "./compose";
import type { DesignNode, DesignNodeStyle } from "./design-node";
import {
  findDesignNodeById,
  findDesignNodeParent,
  walkDesignTree,
} from "./design-node";
import {
  findMaster,
  bakeInstance,
  filterAllowedOverrides,
  isInstanceChild,
  resolveTree as resolveComponentTree,
  makeCompositeId,
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
  FrameItem,
  TextItem,
  PromptRun,
  MasterEditSession,
  MasterEditReturnTarget,
  VariantPreviewVariant,
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
import { getNodeTree, withUpdatedTree, canvasItemToDesignNode, designNodeToCanvasItem } from "./canvas-item-conversion";

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
  | { type: "UPDATE_NODE"; itemId: string; nodeId: string; changes: Partial<PageNode> }
  | { type: "UPDATE_NODE_STYLE"; itemId: string; nodeId: string; style: Partial<DesignNodeStyle> }
  | { type: "UPDATE_NODE_STYLE_BATCH"; itemId: string; nodeIds: string[]; style: Partial<DesignNodeStyle> }
  | { type: "UPDATE_TEXT_CONTENT_SITE"; itemId: string; nodeId: string; text: string }
  | { type: "UPDATE_TEXT_STYLE_SITE"; itemId: string; nodeId: string; style: Partial<DesignNodeStyle> }
  | { type: "REORDER_NODE"; itemId: string; nodeId: string; newIndex: number; parentNodeId?: string }
  | { type: "REPARENT_NODE"; itemId: string; nodeId: string; sourceParentId: string | undefined; targetParentId: string | undefined; targetIndex: number }
  | {
      type: "INSERT_SECTION";
      itemId: string;
      index?: number;
      section: PageNode | DesignNode;
      /** When set, insert under this frame/group; omit = page root children (legacy) */
      parentNodeId?: string | null;
    }
  | {
      type: "PASTE_DESIGN_NODES";
      itemId: string;
      nodes: DesignNode[];
      /** Insert after this id among siblings under parentNodeId (or root if parent omitted) */
      insertAfterId?: string | null;
      /** When set, paste into this frame/group's children; omit = page root children */
      parentNodeId?: string | null;
    }
  | { type: "DUPLICATE_SECTION"; itemId: string; nodeId: string }
  | { type: "DELETE_SECTION"; itemId: string; nodeId: string }
  | { type: "REPLACE_SECTION"; itemId: string; nodeId: string; replacement: DesignNode }
  | { type: "RESET_NODE_STYLE_OVERRIDE"; itemId: string; nodeId: string; property: keyof DesignNodeStyle; breakpoint: Breakpoint }
  | { type: "TOGGLE_NODE_HIDDEN"; itemId: string; nodeId: string; breakpoint: Breakpoint }

  // Selection
  | { type: "SELECT_ITEM"; itemId: string; addToSelection?: boolean }
  | { type: "SELECT_NODE"; itemId: string; nodeId: string }
  | { type: "DESELECT_ALL" }
  | { type: "ESCAPE" }

  // Multi-select
  | { type: "TOGGLE_NODE_SELECTION"; itemId: string; nodeId: string }
  | { type: "SET_SELECTED_NODES"; itemId: string; nodeIds: string[] }
  | { type: "CLEAR_MULTI_SELECTION" }
  | { type: "ALIGN_NODES"; itemId: string; direction: AlignDirection }
  | { type: "DISTRIBUTE_NODES"; itemId: string; axis: DistributeAxis }
  | { type: "GROUP_NODES"; itemId: string }
  | { type: "UNGROUP_NODES"; itemId: string; nodeId: string }

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
  | { type: "CREATE_MASTER"; itemId: string; nodeId: string; name: string; category: string }
  | { type: "INSERT_INSTANCE"; itemId: string; masterId: string; index?: number; presetId?: string | null }
  | { type: "SET_INSTANCE_PRESET"; itemId: string; instanceNodeId: string; presetId: string | null }
  | { type: "DETACH_INSTANCE"; itemId: string; nodeId: string }
  | { type: "UPDATE_INSTANCE_OVERRIDE"; itemId: string; instanceId: string; masterNodeId: string; override: NodeOverride }
  | { type: "UPDATE_INSTANCE_OVERRIDE_BATCH"; itemId: string; instanceIds: string[]; masterNodeIds: string[]; override: NodeOverride }
  | { type: "RESET_INSTANCE_OVERRIDE_FIELD"; itemId: string; instanceId: string; masterNodeId: string; category: "style" | "content" | "hidden" | "all"; field: string }
  | { type: "RESET_ALL_OVERRIDES"; itemId: string; nodeId: string }
  | { type: "DELETE_MASTER"; masterId: string }
  | { type: "RENAME_MASTER"; masterId: string; name: string }

  // Built-in promotion (Track 3)
  | { type: "PROMOTE_BUILTIN_TO_USER"; itemId: string; instanceNodeId: string }

  // Master edit mode (Track 3)
  | { type: "ENTER_MASTER_EDIT"; masterId: string; returnTo?: MasterEditReturnTarget | null }
  | { type: "UPDATE_MASTER_NODE"; masterId: string; nodeId: string; changes: Partial<DesignNode> }
  | { type: "UPDATE_MASTER_NODE_STYLE"; masterId: string; nodeId: string; style: Partial<import("./design-node").DesignNodeStyle> }
  | { type: "COMMIT_MASTER_EDIT" }
  | { type: "CANCEL_MASTER_EDIT" }

  // Canvas-level creation tools
  | { type: "ADD_FRAME"; x: number; y: number; width: number; height: number }
  | { type: "ADD_TEXT"; x: number; y: number; width: number; height: number; mode: "click" | "drag" }
  | { type: "ADD_ARTBOARD"; x: number; y: number; breakpoint: Breakpoint; name?: string; siteId?: string }
  | { type: "CONVERT_TO_ARTBOARD"; itemId: string; breakpoint: Breakpoint }
  | { type: "REPARENT_TO_ARTBOARD"; itemId: string; artboardId: string; parentNodeId: string; index: number }
  | { type: "REPARENT_TO_CANVAS"; artboardId: string; nodeId: string }

  // Persistence
  | { type: "LOAD_STATE"; state: UnifiedCanvasState }

  // Variant comparison (1+1 derivation)
  | { type: "SET_VARIANT_PREVIEW"; itemId: string; variants: VariantPreviewVariant[] }
  | { type: "SET_ACTIVE_VARIANT"; index: number }
  | { type: "PICK_VARIANT"; variantIndex: number };

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

/**
 * Check if a node is a descendant of another node in the tree.
 * Used for cycle detection during reparenting.
 */
function isDescendantOf(tree: TreeNode, potentialDescendantId: string, ancestorId: string): boolean {
  if (tree.id === ancestorId) {
    // Check if potentialDescendantId exists in this subtree
    if (tree.id === potentialDescendantId) return true;
    const children = tree.children ?? [];
    for (const child of children) {
      if (child.id === potentialDescendantId || isDescendantOf(child, potentialDescendantId, child.id)) {
        return true;
      }
    }
    return false;
  }

  if (!tree.children) return false;
  for (const child of tree.children) {
    if (isDescendantOf(child, potentialDescendantId, ancestorId)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a target node is a valid parent for reparenting operations.
 * Valid parents are frames or groups.
 */
function isValidParent(node: TreeNode): boolean {
  return node.type === "frame" || (node as DesignNode).isGroup === true;
}

/** Insert one section/node as a child of parentNodeId, or at page root when parentNodeId is omitted. */
function insertSectionInTree(
  pageTree: TreeNode,
  parentNodeId: string | undefined,
  index: number | undefined,
  section: TreeNode
): TreeNode | null {
  if (parentNodeId === undefined) {
    const children = pageTree.children ?? [];
    const insertIndex =
      typeof index === "number" ? Math.max(0, Math.min(index, children.length)) : children.length;
    const next = [...children];
    next.splice(insertIndex, 0, section);
    return { ...pageTree, children: next };
  }

  const parent = findDesignNodeById(pageTree as DesignNode, parentNodeId);
  if (!parent || !isValidParent(parent)) return null;

  const insertIn = (node: TreeNode): TreeNode => {
    if (node.id === parentNodeId) {
      const children = node.children ?? [];
      const insertIndex =
        typeof index === "number" ? Math.max(0, Math.min(index, children.length)) : children.length;
      const next = [...children];
      next.splice(insertIndex, 0, section);
      return { ...node, children: next } as TreeNode;
    }
    if (!node.children?.length) return node;
    return { ...node, children: node.children.map(insertIn) } as TreeNode;
  };

  return insertIn(pageTree);
}

/** Paste nodes as children of parentNodeId, or at page root when parentNodeId is omitted. */
function pasteDesignNodesInTree(
  pageTree: TreeNode,
  parentNodeId: string | undefined,
  insertAfterId: string | null | undefined,
  nodes: TreeNode[]
): TreeNode | null {
  if (nodes.length === 0) return pageTree;

  if (parentNodeId === undefined) {
    const children = pageTree.children ?? [];
    let insertIndex = children.length;
    if (insertAfterId) {
      const idx = children.findIndex((c) => c.id === insertAfterId);
      if (idx !== -1) insertIndex = idx + 1;
    }
    const next = [...children];
    for (let i = 0; i < nodes.length; i++) {
      next.splice(insertIndex + i, 0, nodes[i]);
    }
    return { ...pageTree, children: next };
  }

  const parent = findDesignNodeById(pageTree as DesignNode, parentNodeId);
  if (!parent || !isValidParent(parent)) return null;

  const pasteUnder = (node: TreeNode): TreeNode => {
    if (node.id === parentNodeId) {
      const children = node.children ?? [];
      let insertIndex = children.length;
      if (insertAfterId) {
        const idx = children.findIndex((c) => c.id === insertAfterId);
        if (idx !== -1) insertIndex = idx + 1;
      }
      const next = [...children];
      for (let i = 0; i < nodes.length; i++) {
        next.splice(insertIndex + i, 0, nodes[i]);
      }
      return { ...node, children: next } as TreeNode;
    }
    if (!node.children?.length) return node;
    return { ...node, children: node.children.map(pasteUnder) } as TreeNode;
  };

  return pasteUnder(pageTree);
}

/**
 * Reparent a node in a tree: remove from source and insert at target.
 * Returns null if the operation is invalid.
 */
export function reparentNodeInTree(
  tree: TreeNode,
  nodeId: string,
  sourceParentId: string | undefined,
  targetParentId: string | undefined,
  targetIndex: number
): TreeNode | null {
  // Find the node being moved
  let nodeToMove: TreeNode | null = null;

  // Helper to extract a node from a parent
  function extractNode(parent: TreeNode, id: string): TreeNode | null {
    const children = parent.children ?? [];
    const found = children.find((c) => c.id === id);
    if (found) return found;
    for (const child of children) {
      const result = extractNode(child, id);
      if (result) return result;
    }
    return null;
  }

  // If sourceParentId is undefined, node is at root level
  if (sourceParentId === undefined) {
    const rootChildren = tree.children ?? [];
    const sourceIndex = rootChildren.findIndex((c) => c.id === nodeId);
    if (sourceIndex === -1) return null;
    nodeToMove = rootChildren[sourceIndex];
  } else {
    const sourceParent = findDesignNodeById(tree as DesignNode, sourceParentId);
    if (!sourceParent) return null;
    const children = sourceParent.children ?? [];
    const sourceIndex = children.findIndex((c) => c.id === nodeId);
    if (sourceIndex === -1) return null;
    nodeToMove = children[sourceIndex];
  }

  if (!nodeToMove) return null;

  // Cycle detection: cannot reparent into own descendant
  if (targetParentId !== undefined) {
    if (isDescendantOf(tree, targetParentId, nodeId)) {
      return null;
    }
  }

  // Build the new tree with node removed from source and inserted at target
  function rebuildTree(currentNode: TreeNode): TreeNode {
    // Case 1: This is the source parent - remove the node
    if (sourceParentId !== undefined && currentNode.id === sourceParentId) {
      const children = currentNode.children ?? [];
      const filtered = children.filter((c) => c.id !== nodeId);
      if (filtered.length === children.length) return currentNode; // No change
      return { ...currentNode, children: filtered } as TreeNode;
    }

    // Case 2: This is the target parent - insert the node
    if (targetParentId !== undefined && currentNode.id === targetParentId) {
      const children = currentNode.children ?? [];
      // Check for valid parent type
      if (!isValidParent(currentNode)) {
        return currentNode;
      }
      // If same parent, account for removal
      const adjustedIndex = sourceParentId === targetParentId
        ? (sourceParentId === undefined ? (tree.children ?? []).findIndex((c) => c.id === nodeId) : 0)
        : 0;
      const effectiveIndex = sourceParentId === targetParentId
        ? (targetIndex > adjustedIndex ? targetIndex - 1 : targetIndex)
        : targetIndex;

      const clampedIndex = Math.max(0, Math.min(effectiveIndex, children.length));
      const newChildren = [...children];
      newChildren.splice(clampedIndex, 0, nodeToMove!);
      return { ...currentNode, children: newChildren } as TreeNode;
    }

    // Case 3: This is the root (when source or target is undefined)
    if (currentNode === tree || (currentNode.id === tree.id)) {
      let result = currentNode;

      // Handle root-level source removal
      if (sourceParentId === undefined) {
        const rootChildren = result.children ?? [];
        const filtered = rootChildren.filter((c) => c.id !== nodeId);
        if (filtered.length !== rootChildren.length) {
          result = { ...result, children: filtered } as TreeNode;
        }
      }

      // Handle root-level target insertion
      if (targetParentId === undefined) {
        const rootChildren = result.children ?? [];
        // If same parent, account for removal
        const adjustedIndex = sourceParentId === undefined
          ? (rootChildren.findIndex((c) => c.id === nodeId))
          : -1;
        const effectiveIndex = sourceParentId === undefined && adjustedIndex !== -1
          ? (targetIndex > adjustedIndex ? targetIndex - 1 : targetIndex)
          : targetIndex;
        const clampedIndex = Math.max(0, Math.min(effectiveIndex, rootChildren.length));
        const newChildren = [...rootChildren];
        newChildren.splice(clampedIndex, 0, nodeToMove!);
        result = { ...result, children: newChildren } as TreeNode;
        return result;
      }

      // Recurse into children if no root-level operation handled it
      if (result.children) {
        const newChildren = result.children.map((child) => rebuildTree(child));
        if (newChildren.some((c, i) => c !== result.children![i])) {
          result = { ...result, children: newChildren } as TreeNode;
        }
      }

      return result;
    }

    // Case 4: Recurse into children
    if (!currentNode.children) return currentNode;
    const newChildren = currentNode.children.map((child) => rebuildTree(child));
    if (newChildren.every((c, i) => c === currentNode.children![i])) {
      return currentNode;
    }
    return { ...currentNode, children: newChildren } as TreeNode;
  }

  return rebuildTree(tree);
}

function updateArtboardsForSite(
  items: CanvasItem[],
  itemId: string,
  updater: (pageTree: TreeNode) => TreeNode
): CanvasItem[] | null {
  const sourceArtboard = items.find(
    (item): item is ArtboardItem =>
      item.kind === "artboard" && item.id === itemId
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
  if (!state.selection.activeItemId) return "desktop";
  const artboard = state.items.find(
    (item): item is ArtboardItem =>
      item.kind === "artboard" && item.id === state.selection.activeItemId
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

/** Restore selection on the page artboard after exiting master edit (Track 9 Phase B). */
function selectionAfterMasterEdit(
  state: CanvasReducerState,
  returnTo: MasterEditReturnTarget
): UnifiedCanvasState["selection"] {
  const base = state.selection;
  const artboard = state.items.find(
    (i): i is ArtboardItem => i.kind === "artboard" && i.id === returnTo.itemId
  );
  if (!artboard) {
    return { ...base, activeItemId: returnTo.itemId };
  }
  const source = artboard.pageTree as DesignNode;
  const inst = findDesignNodeById(source, returnTo.instanceRootSourceId);
  if (!inst?.componentRef) {
    return {
      ...base,
      activeItemId: returnTo.itemId,
      selectedNodeId: null,
      selectedNodeIds: [],
    };
  }
  const master = findMaster(state.components, inst.componentRef.masterId);
  if (!master) {
    return { ...base, activeItemId: returnTo.itemId };
  }
  const resolved = resolveComponentTree(source, state.components);
  const pref = returnTo.preferredNodeId;
  const inResolved = (id: string | null) => Boolean(id && findDesignNodeById(resolved, id));

  if (pref && inResolved(pref)) {
    return {
      ...base,
      activeItemId: returnTo.itemId,
      selectedNodeId: pref,
      selectedNodeIds: [pref],
    };
  }

  const rootComposite = makeCompositeId(returnTo.instanceRootSourceId, master.tree.id);
  if (inResolved(rootComposite)) {
    return {
      ...base,
      activeItemId: returnTo.itemId,
      selectedNodeId: rootComposite,
      selectedNodeIds: [rootComposite],
    };
  }

  if (findDesignNodeById(source, returnTo.instanceRootSourceId)) {
    return {
      ...base,
      activeItemId: returnTo.itemId,
      selectedNodeId: returnTo.instanceRootSourceId,
      selectedNodeIds: [returnTo.instanceRootSourceId],
    };
  }

  return {
    ...base,
    activeItemId: returnTo.itemId,
    selectedNodeId: null,
    selectedNodeIds: [],
  };
}

/** Remap selection from a detached instance id to the baked subtree root (Track 9 Phase C). */
function selectionAfterDetach(
  sel: UnifiedCanvasState["selection"],
  itemId: string,
  oldInstanceId: string,
  bakedRootId: string
): UnifiedCanvasState["selection"] {
  if (sel.activeItemId !== itemId) return sel;

  const under = (id: string | null) =>
    Boolean(id && (id === oldInstanceId || id.startsWith(`${oldInstanceId}::`)));

  if (!under(sel.selectedNodeId) && !sel.selectedNodeIds.some((id) => under(id))) {
    return sel;
  }

  return {
    ...sel,
    selectedNodeId: bakedRootId,
    selectedNodeIds: [bakedRootId],
  };
}

/**
 * Apply an updater to the DesignNode tree of any editable item (artboard, frame, text).
 * Skips items that don't match itemId or have no tree. Returns null from the updater
 * to leave the item unchanged.
 */
function updateItemTree(
  state: CanvasReducerState,
  itemId: string,
  updater: (tree: DesignNode, item: CanvasItem) => DesignNode | null,
): CanvasReducerState {
  return {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== itemId) return item;
      const tree = getNodeTree(item);
      if (!tree) return item;
      const updated = updater(tree, item);
      if (!updated) return item;
      return withUpdatedTree(item, updated);
    }),
    updatedAt: now(),
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
    "DELETE_SECTION", "REORDER_NODE", "INSERT_SECTION", "PASTE_DESIGN_NODES",
    "GROUP_NODES", "UNGROUP_NODES", "DUPLICATE_SECTION",
    "REPARENT_NODE",
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
      const clearNodes = state.selection.activeItemId === action.itemId;
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.itemId),
        selection: {
          ...state.selection,
          selectedItemIds: state.selection.selectedItemIds.filter(
            (id) => id !== action.itemId
          ),
          activeItemId: clearNodes ? null : state.selection.activeItemId,
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
          activeItemId: null,
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

    // ── Canvas-Level Creation Tools ───────────────────────────────────────

    case "ADD_FRAME": {
      const { x, y, width, height } = action;
      const id = uid("frame");
      const maxZ = state.items.reduce((max, item) => Math.max(max, item.zIndex), 0);
      const newFrame: FrameItem = {
        id,
        kind: "frame",
        x,
        y,
        width,
        height,
        zIndex: maxZ + 1,
        locked: false,
        name: "Frame",
        style: {
          width,
          height,
          display: "flex",
          flexDirection: "column",
          padding: { top: 12, right: 12, bottom: 12, left: 12 },
        },
        children: [],
      };
      return {
        ...state,
        items: [...state.items, newFrame],
        selection: {
          ...state.selection,
          selectedItemIds: [id],
          activeItemId: id,
          selectedNodeId: null,
          selectedNodeIds: [],
        },
        updatedAt: now(),
      };
    }

    case "ADD_TEXT": {
      const { x, y, width, height, mode } = action;
      const id = uid("text");
      const maxZ = state.items.reduce((max, item) => Math.max(max, item.zIndex), 0);
      const newText: TextItem = {
        id,
        kind: "text",
        x,
        y,
        width,
        height: mode === "click" ? 28 : height,
        zIndex: maxZ + 1,
        locked: false,
        name: "Text",
        style: {
          width,
          height: mode === "click" ? ("hug" as any) : height,
          fontSize: 16,
          lineHeight: 1.4,
          foreground: "#1A1A1A",
        },
        content: { text: "Type something" },
      };
      return {
        ...state,
        items: [...state.items, newText],
        selection: {
          ...state.selection,
          selectedItemIds: [id],
          activeItemId: id,
          selectedNodeId: null,
          selectedNodeIds: [],
        },
        updatedAt: now(),
      };
    }

    case "ADD_ARTBOARD": {
      const { x, y, breakpoint, name, siteId } = action;
      const id = uid("artboard");
      const artboardSiteId = siteId || uid("site");
      const widths: Record<string, number> = { desktop: 1440, tablet: 768, mobile: 375 };
      const maxZ = state.items.reduce((max, item) => Math.max(max, item.zIndex), 0);

      const newArtboard: ArtboardItem = {
        id,
        kind: "artboard",
        x,
        y,
        width: widths[breakpoint] || 1440,
        height: 900,
        zIndex: maxZ + 1,
        locked: false,
        siteId: artboardSiteId,
        breakpoint,
        name: name || `${breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1)} Artboard`,
        pageTree: {
          id: `root-${uid("frame")}`,
          type: "frame" as const,
          name: "Root",
          style: {
            width: widths[breakpoint] || 1440,
            height: 900,
            display: "flex" as const,
            flexDirection: "column" as const,
            background: "#FFFFFF",
          },
          children: [],
        },
      };

      return {
        ...state,
        items: [...state.items, newArtboard],
        selection: {
          ...state.selection,
          selectedItemIds: [id],
          activeItemId: id,
          selectedNodeId: null,
          selectedNodeIds: [],
        },
        updatedAt: now(),
      };
    }

    case "CONVERT_TO_ARTBOARD": {
      const { itemId, breakpoint } = action;
      const item = state.items.find((i) => i.id === itemId);
      if (!item || item.kind !== "frame") return state;

      const frameItem = item as FrameItem;
      const artboardSiteId = uid("site");
      const tree = canvasItemToDesignNode(frameItem);

      const newArtboard: ArtboardItem = {
        id: uid("artboard"),
        kind: "artboard",
        x: frameItem.x,
        y: frameItem.y,
        width: frameItem.width,
        height: frameItem.height,
        zIndex: frameItem.zIndex,
        locked: frameItem.locked,
        siteId: artboardSiteId,
        breakpoint,
        name: frameItem.name || "Artboard",
        pageTree: tree,
      };

      return {
        ...state,
        items: state.items
          .filter((i) => i.id !== itemId)
          .concat(newArtboard),
        selection: {
          ...state.selection,
          selectedItemIds: [newArtboard.id],
          activeItemId: newArtboard.id,
          selectedNodeId: null,
          selectedNodeIds: [],
        },
        updatedAt: now(),
      };
    }

    case "REPARENT_TO_ARTBOARD": {
      const { itemId, artboardId, parentNodeId, index } = action;
      const sourceItem = state.items.find((i) => i.id === itemId);
      if (!sourceItem || (sourceItem.kind !== "frame" && sourceItem.kind !== "text")) return state;

      const artboard = state.items.find((i) => i.id === artboardId);
      if (!artboard || artboard.kind !== "artboard") return state;

      const node = canvasItemToDesignNode(sourceItem as FrameItem | TextItem);

      // Recalculate position: canvas-world → artboard-local
      node.style = {
        ...node.style,
        position: "absolute",
        x: Math.round(sourceItem.x - artboard.x),
        y: Math.round(sourceItem.y - artboard.y),
      };

      // Insert node into artboard tree
      const tree = getNodeTree(artboard);
      if (!tree) return state;

      const insertIntoTree = (root: DesignNode, targetId: string, child: DesignNode, idx: number): DesignNode => {
        if (root.id === targetId) {
          const children = [...(root.children || [])];
          if (idx < 0 || idx >= children.length) {
            children.push(child);
          } else {
            children.splice(idx, 0, child);
          }
          return { ...root, children };
        }
        if (!root.children) return root;
        return {
          ...root,
          children: root.children.map((c) => insertIntoTree(c, targetId, child, idx)),
        };
      };

      const updatedTree = insertIntoTree(tree, parentNodeId, node, index);

      return {
        ...state,
        items: state.items
          .filter((i) => i.id !== itemId)
          .map((i) => (i.id === artboardId ? withUpdatedTree(i, updatedTree) : i)),
        selection: {
          ...state.selection,
          selectedItemIds: [artboardId],
          activeItemId: artboardId,
          selectedNodeId: node.id,
          selectedNodeIds: [node.id],
        },
        updatedAt: now(),
      };
    }

    case "REPARENT_TO_CANVAS": {
      const { artboardId, nodeId } = action;
      const artboard = state.items.find((i) => i.id === artboardId);
      if (!artboard || artboard.kind !== "artboard") return state;

      const tree = getNodeTree(artboard);
      if (!tree) return state;

      // Find the node to extract
      const node = findDesignNodeById(tree, nodeId);
      if (!node) return state;

      // Calculate canvas-world position
      const localX = typeof node.style.x === "number" ? node.style.x : 0;
      const localY = typeof node.style.y === "number" ? node.style.y : 0;
      const canvasX = artboard.x + localX;
      const canvasY = artboard.y + localY;

      // Remove node from artboard tree
      const removeFromTree = (root: DesignNode, targetId: string): DesignNode => {
        if (!root.children) return root;
        return {
          ...root,
          children: root.children
            .filter((c) => c.id !== targetId)
            .map((c) => removeFromTree(c, targetId)),
        };
      };

      const updatedTree = removeFromTree(tree, nodeId);
      const maxZ = state.items.reduce((max, item) => Math.max(max, item.zIndex), 0);
      const canvasItem = designNodeToCanvasItem(node, canvasX, canvasY, maxZ + 1);

      return {
        ...state,
        items: [
          ...state.items.map((i) => (i.id === artboardId ? withUpdatedTree(i, updatedTree) : i)),
          canvasItem,
        ],
        selection: {
          ...state.selection,
          selectedItemIds: [canvasItem.id],
          activeItemId: canvasItem.id,
          selectedNodeId: null,
          selectedNodeIds: [],
        },
        updatedAt: now(),
      };
    }

    // ── Artboard Node Editing ─────────────────────────────────────────────

    case "UPDATE_NODE": {
      return updateItemTree(state, action.itemId, (tree) =>
        updateNodeInTree(tree, action.nodeId, (node) => ({
          ...node,
          ...action.changes,
          id: node.id,
          type: node.type,
        }))
      );
    }

    case "UPDATE_NODE_STYLE": {
      const breakpoint = getActiveBreakpoint(state);
      const treeUpdater = (tree: DesignNode) =>
        updateNodeInTree(tree, action.nodeId, (node) => {
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

      // Artboards: sync across all artboards in the site (desktop/tablet/mobile)
      const targetItem = state.items.find((i) => i.id === action.itemId);
      if (targetItem?.kind === "artboard") {
        const nextItems = updateArtboardsForSite(state.items, action.itemId, treeUpdater);
        return {
          ...state,
          items: nextItems ?? state.items,
          updatedAt: now(),
        };
      }

      // Frame / text items: single-item update via updateItemTree
      return updateItemTree(state, action.itemId, treeUpdater);
    }

    case "UPDATE_NODE_STYLE_BATCH": {
      const breakpoint = getActiveBreakpoint(state);
      const { nodeIds } = action;

      const treeUpdater = (pageTree: DesignNode) => {
        let result = pageTree;
        for (const nodeId of nodeIds) {
          result = updateNodeInTree(result, nodeId, (node) => {
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
        }
        return result;
      };

      const historyAfterBatch = pushHistory(
        state.history,
        `Styled ${nodeIds.length} element${nodeIds.length === 1 ? "" : "s"}`,
        state.items,
        state.selection,
        state.components
      );

      // Artboards: sync across all artboards in the site
      const targetItem = state.items.find((i) => i.id === action.itemId);
      if (targetItem?.kind === "artboard") {
        const nextItems = updateArtboardsForSite(state.items, action.itemId, treeUpdater);
        if (!nextItems) return state;
        return {
          ...state,
          items: nextItems,
          history: historyAfterBatch,
          updatedAt: now(),
        };
      }

      // Frame / text items: single-item update
      const stateAfterUpdate = updateItemTree(state, action.itemId, treeUpdater);
      return { ...stateAfterUpdate, history: historyAfterBatch };
    }

    case "UPDATE_TEXT_CONTENT_SITE": {
      const nextItems = updateArtboardsForSite(
        state.items,
        action.itemId,
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
        action.itemId,
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
          item.kind === "artboard" && item.id === action.itemId
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

    case "REPARENT_NODE": {
      const { itemId, nodeId, sourceParentId, targetParentId, targetIndex } = action;

      // Reject structural mutations on instance children
      if (isInstanceChild(nodeId)) {
        return state;
      }

      const historyAfterReparent = pushHistory(
        state.history,
        "Moved element to new container",
        state.items,
        state.selection,
        state.components
      );

      const targetItem = state.items.find((i) => i.id === itemId);

      // Frame / text items: single-item reparent
      if (targetItem && targetItem.kind !== "artboard") {
        const tree = getNodeTree(targetItem);
        if (!tree) return state;

        if (targetParentId !== undefined) {
          const targetParent = findDesignNodeById(tree, targetParentId);
          if (!targetParent || !isValidParent(targetParent)) return state;
        }

        const reparentedTree = reparentNodeInTree(tree, nodeId, sourceParentId, targetParentId, targetIndex);
        if (!reparentedTree) return state;

        return {
          ...state,
          items: state.items.map((item) =>
            item.id === itemId ? withUpdatedTree(item, reparentedTree as DesignNode) : item
          ),
          selection: {
            ...state.selection,
            selectedNodeId: nodeId,
            selectedNodeIds: [nodeId],
          },
          history: historyAfterReparent,
          updatedAt: now(),
        };
      }

      // Artboards: validate and sync across site
      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === itemId
      );

      if (!artboard) return state;

      // Validate target parent type if specified
      if (targetParentId !== undefined) {
        const targetParent = findDesignNodeById(artboard.pageTree as DesignNode, targetParentId);
        if (!targetParent) return state;
        // Target must be a valid parent: frame or group
        if (!isValidParent(targetParent)) {
          return state;
        }
      }

      // Apply reparenting
      const reparentedTree = reparentNodeInTree(
        artboard.pageTree,
        nodeId,
        sourceParentId,
        targetParentId,
        targetIndex
      );

      if (!reparentedTree) return state;

      // Sync across all artboards in the same site
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) {
            return item;
          }

          if (item.id === artboard.id) {
            return {
              ...item,
              pageTree: reparentedTree,
            };
          }

          // Apply same reparenting to other artboards in same site
          const synced = reparentNodeInTree(
            item.pageTree,
            nodeId,
            sourceParentId,
            targetParentId,
            targetIndex
          );

          return synced ? { ...item, pageTree: synced } : item;
        }),
        selection: {
          ...state.selection,
          selectedNodeId: nodeId,
          selectedNodeIds: [nodeId],
        },
        history: historyAfterReparent,
        updatedAt: now(),
      };
    }

    case "INSERT_SECTION": {
      const parentKey =
        action.parentNodeId === null || action.parentNodeId === undefined
          ? undefined
          : action.parentNodeId;

      const tryInsert = (pageTree: TreeNode): TreeNode | null =>
        insertSectionInTree(pageTree, parentKey, action.index, action.section);

      const historyAfterInsert = pushHistory(
        state.history,
        `Added ${action.section.name} section`,
        state.items,
        state.selection,
        state.components
      );

      const selectionAfterInsert = {
        ...state.selection,
        selectedNodeId: action.section.id,
        selectedNodeIds: [action.section.id],
      };

      const targetItem = state.items.find((i) => i.id === action.itemId);

      // Frame / text items: single-item insert
      if (targetItem && targetItem.kind !== "artboard") {
        const tree = getNodeTree(targetItem);
        if (!tree) return state;
        const nextTree = tryInsert(tree);
        if (!nextTree) return state;
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.itemId ? withUpdatedTree(item, nextTree as DesignNode) : item
          ),
          selection: selectionAfterInsert,
          history: historyAfterInsert,
          updatedAt: now(),
        };
      }

      // Artboards: validate on source then sync across site
      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.itemId
      );
      if (!artboard) return state;

      const sourceInsertedTree = tryInsert(artboard.pageTree);
      if (!sourceInsertedTree) return state;

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          const nextTree = tryInsert(item.pageTree);
          return nextTree ? { ...item, pageTree: nextTree } : item;
        }),
        selection: selectionAfterInsert,
        history: historyAfterInsert,
        updatedAt: now(),
      };
    }

    case "PASTE_DESIGN_NODES": {
      if (action.nodes.length === 0) return state;

      const parentKey =
        action.parentNodeId === null || action.parentNodeId === undefined
          ? undefined
          : action.parentNodeId;

      const tryPaste = (pageTree: TreeNode): TreeNode | null =>
        pasteDesignNodesInTree(
          pageTree,
          parentKey,
          action.insertAfterId,
          action.nodes as TreeNode[]
        );

      const historyAfterPaste = pushHistory(
        state.history,
        action.nodes.length === 1 ? "Pasted layer" : `Pasted ${action.nodes.length} layers`,
        state.items,
        state.selection,
        state.components
      );

      const pastedIds = action.nodes.map((n) => n.id);
      const selectionAfterPaste = {
        ...state.selection,
        selectedNodeId: pastedIds[0],
        selectedNodeIds: pastedIds,
      };

      const targetItem = state.items.find((i) => i.id === action.itemId);

      // Frame / text items: single-item paste
      if (targetItem && targetItem.kind !== "artboard") {
        const tree = getNodeTree(targetItem);
        if (!tree) return state;
        const nextTree = tryPaste(tree);
        if (!nextTree) return state;
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.itemId ? withUpdatedTree(item, nextTree as DesignNode) : item
          ),
          selection: selectionAfterPaste,
          history: historyAfterPaste,
          updatedAt: now(),
        };
      }

      // Artboards: validate on source then sync across site
      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === action.itemId
      );
      if (!artboard) return state;
      if (!tryPaste(artboard.pageTree)) return state;

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          const nextTree = tryPaste(item.pageTree);
          return nextTree ? { ...item, pageTree: nextTree } : item;
        }),
        selection: selectionAfterPaste,
        history: historyAfterPaste,
        updatedAt: now(),
      };
    }

    case "DUPLICATE_SECTION": {
      // Resolve the source tree (works for artboards, frames, and text items)
      const dupSourceItem = state.items.find((i) => i.id === action.itemId);
      if (!dupSourceItem) return state;
      const dupSourceTree = getNodeTree(dupSourceItem);
      if (!dupSourceTree) return state;

      // When multi-select is active, duplicate all normalized selected nodes
      const idsToDuplicate = state.selection.selectedNodeIds.length > 1
        ? normalizeSelection(state.selection.selectedNodeIds, dupSourceTree)
        : [action.nodeId];

      const children = dupSourceTree.children ?? [];
      const clones: Array<{ sourceId: string; clone: TreeNode }> = [];

      for (const id of idsToDuplicate) {
        const sourceIndex = children.findIndex((c) => c.id === id);
        if (sourceIndex === -1) continue;
        const sourceNode = children[sourceIndex] as DesignNode;
        if (sourceNode.componentRef) {
          // Duplicate an instance root → fresh instance with empty overrides
          const srcRef = sourceNode.componentRef;
          const newRef: ComponentInstanceRef = {
            masterId: srcRef.masterId,
            masterVersion: srcRef.masterVersion,
            overrides: {},
          };
          if (srcRef.presetId) newRef.presetId = srcRef.presetId;
          const newInstance: TreeNode = {
            ...sourceNode,
            id: uid(sourceNode.type),
            componentRef: newRef,
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

      // Frame / text items: single-item duplicate
      if (dupSourceItem.kind !== "artboard") {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.itemId
              ? withUpdatedTree(item, insertClones(dupSourceTree) as DesignNode)
              : item
          ),
          selection: {
            ...state.selection,
            selectedNodeId: cloneIds[0],
            selectedNodeIds: cloneIds,
          },
          history: historyAfterDup,
          updatedAt: now(),
        };
      }

      // Artboards: sync across site
      const artboard = dupSourceItem as ArtboardItem;
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
      const delSourceItem = state.items.find((i) => i.id === action.itemId);
      if (!delSourceItem) return state;
      const delSourceTree = getNodeTree(delSourceItem);
      if (!delSourceTree) return state;

      // When multi-select is active, delete all normalized selected nodes
      const idsToDelete = state.selection.selectedNodeIds.length > 1
        ? normalizeSelection(state.selection.selectedNodeIds, delSourceTree)
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

      const selectionAfterDel = {
        ...state.selection,
        selectedNodeId: null,
        selectedNodeIds: [],
      };

      // Frame / text items: single-item delete
      if (delSourceItem.kind !== "artboard") {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.itemId
              ? withUpdatedTree(item, removeSections(delSourceTree) as DesignNode)
              : item
          ),
          selection: selectionAfterDel,
          history: historyAfterDel,
          updatedAt: now(),
        };
      }

      // Artboards: sync across site
      const artboard = delSourceItem as ArtboardItem;
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          return { ...item, pageTree: removeSections(item.pageTree) };
        }),
        selection: selectionAfterDel,
        history: historyAfterDel,
        updatedAt: now(),
      };
    }

    case "REPLACE_SECTION": {
      const { itemId, nodeId, replacement } = action;
      return updateItemTree(state, itemId, (tree) => {
        const replaceInTree = (node: DesignNode): DesignNode => {
          if (node.id === nodeId) {
            return { ...replacement, id: nodeId };
          }
          if (!node.children) return node;
          return {
            ...node,
            children: node.children.map(replaceInTree),
          };
        };
        return replaceInTree(tree);
      });
    }

    // ── Responsive Overrides ───────────────────────────────────────────────

    case "RESET_NODE_STYLE_OVERRIDE": {
      const { nodeId, property, breakpoint: bp } = action;

      const nextItems = updateArtboardsForSite(state.items, action.itemId, (pageTree) =>
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

      const nextItems = updateArtboardsForSite(state.items, action.itemId, (pageTree) =>
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
          activeItemId: null,
          selectedNodeId: null,
          selectedNodeIds: [],
        },
      };
    }

    case "SELECT_NODE": {
      return {
        ...state,
        selection: {
          selectedItemIds: [action.itemId],
          activeItemId: action.itemId,
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
          activeItemId: null,
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
          activeItemId: null,
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
              activeItemId: null,
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
            activeItemId: action.itemId,
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
            selectedItemIds: [action.itemId],
            activeItemId: action.itemId,
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
            activeItemId: null,
            selectedNodeId: null,
            selectedNodeIds: [],
          },
        };
      }
      return {
        ...state,
        selection: {
          selectedItemIds: [action.itemId],
          activeItemId: action.itemId,
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
          item.kind === "artboard" && item.id === action.itemId
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
          item.kind === "artboard" && item.id === action.itemId
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
          item.kind === "artboard" && item.id === action.itemId
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
          item.kind === "artboard" && item.id === action.itemId
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
          activeItemId: null,
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
          activeItemId: null,
          selectedNodeId: null,
          selectedNodeIds: [],
        },
        history: historyAfterPush,
        updatedAt: now(),
      };
    }

    // ── Component System (Track 3) ─────────────────────────────────────

    case "CREATE_MASTER": {
      const { itemId, nodeId, name, category } = action;
      const stateH = pushHistoryHelper(state, "Create component");

      const artboard = stateH.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === itemId
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
          if (item.id === itemId) return { ...item, pageTree: newTree };
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
      const { itemId, masterId, index, presetId: insertPresetId } = action;
      const stateH = pushHistoryHelper(state, "Insert component");

      const master = findMaster(stateH.components, masterId);
      if (!master) return stateH;

      const artboard = stateH.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === itemId
      );
      if (!artboard) return stateH;

      const instanceRef: ComponentInstanceRef = {
        masterId,
        masterVersion: master.version,
        overrides: {},
      };
      if (insertPresetId) instanceRef.presetId = insertPresetId;

      const instanceNode: DesignNode = {
        id: uid("frame"),
        type: "frame",
        name: master.name,
        style: { width: "fill" as const },
        componentRef: instanceRef,
      };

      const insertIndex = index ?? ((artboard.pageTree as DesignNode).children?.length ?? 0);

      return {
        ...stateH,
        items: stateH.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          const tree = item.pageTree as DesignNode;
          const children = [...(tree.children ?? [])];
          const inst: DesignNode = item.id === itemId
            ? instanceNode
            : { ...instanceNode, id: uid("frame") };
          children.splice(insertIndex, 0, inst);
          return { ...item, pageTree: { ...tree, children } };
        }),
        updatedAt: now(),
      };
    }

    case "SET_INSTANCE_PRESET": {
      const { itemId, instanceNodeId, presetId } = action;
      const stateH = pushHistoryHelper(state, "Set component preset");

      const artboard = stateH.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === itemId
      );
      if (!artboard) return stateH;

      const tree = artboard.pageTree as DesignNode;
      const instanceNode = findDesignNodeById(tree, instanceNodeId);
      if (!instanceNode?.componentRef) return stateH;

      const master = findMaster(stateH.components, instanceNode.componentRef.masterId);
      if (!master) return stateH;
      if (presetId !== null && !master.presets?.some((p) => p.id === presetId)) {
        return stateH;
      }

      const newTree = updateNodeInTree(tree, instanceNodeId, (n) => {
        const ref = { ...n.componentRef! };
        if (presetId === null) {
          delete ref.presetId;
        } else {
          ref.presetId = presetId;
        }
        return { ...n, componentRef: ref };
      });

      const nextItems = updateArtboardsForSite(stateH.items, itemId, (pageTree) => {
        if (pageTree === artboard.pageTree) return newTree;
        return pageTree;
      });

      return {
        ...stateH,
        items: nextItems ?? stateH.items,
        updatedAt: now(),
      };
    }

    case "DETACH_INSTANCE": {
      const { itemId, nodeId } = action;
      const stateH = pushHistoryHelper(state, "Detach component");

      const artboard = stateH.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === itemId
      );
      if (!artboard) return stateH;
      const tree = artboard.pageTree as DesignNode;
      const instanceNode = findDesignNodeById(tree, nodeId);
      if (!instanceNode?.componentRef) return stateH;

      const master = findMaster(stateH.components, instanceNode.componentRef.masterId);
      if (!master) return stateH;

      const baked = bakeInstance(instanceNode, master);
      const newTree = replaceNodeInTree(tree, nodeId, baked);
      const nextSelection = selectionAfterDetach(stateH.selection, itemId, nodeId, baked.id);

      return {
        ...stateH,
        items: stateH.items.map((item) => {
          if (item.kind !== "artboard" || item.siteId !== artboard.siteId) return item;
          if (item.id === itemId) return { ...item, pageTree: newTree };
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
        selection: nextSelection,
        updatedAt: now(),
      };
    }

    case "UPDATE_INSTANCE_OVERRIDE": {
      const { itemId, instanceId, masterNodeId, override } = action;
      const filtered = filterAllowedOverrides(override);
      if (!filtered.style && !filtered.content && !filtered.hidden) return state;

      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === itemId
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

      const nextItems = updateArtboardsForSite(state.items, itemId, (pageTree) => {
        if (pageTree === artboard.pageTree) return newTree;
        return pageTree;
      });

      return {
        ...state,
        items: nextItems ?? state.items,
        updatedAt: now(),
      };
    }

    case "UPDATE_INSTANCE_OVERRIDE_BATCH": {
      const { itemId, instanceIds, masterNodeIds, override } = action;
      if (instanceIds.length !== masterNodeIds.length) return state;

      const filtered = filterAllowedOverrides(override);
      if (!filtered.style && !filtered.content && !filtered.hidden) return state;

      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === itemId
      );
      if (!artboard) return state;

      let tree = artboard.pageTree as DesignNode;

      for (let i = 0; i < instanceIds.length; i++) {
        const instanceId = instanceIds[i];
        const masterNodeId = masterNodeIds[i];

        const instanceNode = findDesignNodeById(tree, instanceId);
        if (!instanceNode?.componentRef) continue;

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

        tree = updateNodeInTree(tree, instanceId, (n) => ({
          ...n,
          componentRef: { ...n.componentRef!, overrides: newOverrides },
        })) as DesignNode;
      }

      const nextItems = updateArtboardsForSite(state.items, itemId, (pageTree) => {
        if (pageTree === artboard.pageTree) return tree;
        return pageTree;
      });

      if (!nextItems) return state;

      const historyAfterBatch = pushHistory(
        state.history,
        `Styled ${instanceIds.length} instance element${instanceIds.length === 1 ? "" : "s"}`,
        state.items,
        state.selection,
        state.components
      );

      return {
        ...state,
        items: nextItems,
        history: historyAfterBatch,
        updatedAt: now(),
      };
    }

    case "RESET_INSTANCE_OVERRIDE_FIELD": {
      const { itemId, instanceId, masterNodeId, category, field } = action;
      const stateH = pushHistoryHelper(state, "Reset override");

      const artboard = stateH.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === itemId
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

      const nextItems = updateArtboardsForSite(stateH.items, itemId, (pageTree) => {
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
      const { itemId, nodeId } = action;
      const stateH = pushHistoryHelper(state, "Reset all overrides");

      const nextItems = updateArtboardsForSite(stateH.items, itemId, (pageTree) =>
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
      const { itemId, instanceNodeId } = action;
      const stateWithHistory = pushHistoryHelper(state, "Create editable copy");

      // Find the artboard and instance node
      const artboard = stateWithHistory.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === itemId
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
      const userPresets = (builtinMaster.presets ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        tree: cloneDesignNodeWithIdMap(p.tree, (oldId) => {
          const mapped = idMap[oldId];
          if (!mapped) {
            return uid("node");
          }
          return mapped;
        }).tree,
      }));

      const userMaster: ComponentMaster = {
        id: userMasterId,
        name: `${builtinMaster.name} (Custom)`,
        category: builtinMaster.category,
        source: "user",
        tree: userTree,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(userPresets.length > 0 ? { presets: userPresets } : {}),
      };

      // Re-key overrides using idMap
      const remappedOverrides: Record<string, import("./design-node").NodeOverride> = {};
      for (const [oldId, override] of Object.entries(instanceNode.componentRef.overrides)) {
        const newId = idMap[oldId];
        if (newId) remappedOverrides[newId] = override;
      }

      // Update instance node's componentRef to point to new user master
      const updatedItems = stateWithHistory.items.map((item) => {
        if (item.kind !== "artboard" || item.id !== itemId) return item;
        return {
          ...item,
          pageTree: updateNodeInTree(item.pageTree as DesignNode, instanceNodeId, (n) => {
            const prev = n.componentRef!;
            const nextRef: ComponentInstanceRef = {
              masterId: userMasterId,
              masterVersion: 1,
              overrides: remappedOverrides,
            };
            if (
              prev.presetId &&
              userMaster.presets?.some((p) => p.id === prev.presetId)
            ) {
              nextRef.presetId = prev.presetId;
            }
            return { ...n, componentRef: nextRef };
          }),
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
          returnTo: {
            itemId,
            instanceRootSourceId: instanceNodeId,
            preferredNodeId: stateWithHistory.selection.selectedNodeId,
          },
        },
        updatedAt: timestamp,
      };
    }

    // ── Master Edit Mode (Track 3) ──────────────────────────────────────

    case "ENTER_MASTER_EDIT": {
      const { masterId, returnTo: returnToArg } = action;
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
          returnTo: returnToArg ?? null,
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
      const session = state.masterEditSession;
      const stateWithHistory = pushHistoryHelper(state, "Commit master edit");

      const updatedComponents = stateWithHistory.components.map((c) => {
        if (c.id !== session.masterId) return c;
        return {
          ...c,
          version: c.version + 1,
          updatedAt: now(),
        };
      });

      const nextState: CanvasReducerState = {
        ...stateWithHistory,
        components: updatedComponents,
        masterEditSession: null,
      };

      return {
        ...nextState,
        selection: session.returnTo
          ? selectionAfterMasterEdit(nextState, session.returnTo)
          : nextState.selection,
      };
    }

    case "CANCEL_MASTER_EDIT": {
      if (!state.masterEditSession) return state;
      const { masterId, snapshotTree, historyBoundaryIndex, returnTo } = state.masterEditSession;

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

      const nextState: CanvasReducerState = {
        ...state,
        components: restoredComponents,
        history: rewoundHistory,
        masterEditSession: null,
      };

      return {
        ...nextState,
        selection: returnTo ? selectionAfterMasterEdit(nextState, returnTo) : nextState.selection,
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
        variantPreview: null, // Never restore transient variant preview state
      };
    }

    // ── Variant Comparison ──────────────────────────────────────────────────

    case "SET_VARIANT_PREVIEW": {
      return {
        ...state,
        variantPreview: {
          itemId: action.itemId,
          variants: action.variants,
          activeIndex: 0,
        },
        updatedAt: now(),
      };
    }

    case "SET_ACTIVE_VARIANT": {
      if (!state.variantPreview) return state;
      return {
        ...state,
        variantPreview: {
          ...state.variantPreview,
          activeIndex: action.index,
        },
      };
    }

    case "PICK_VARIANT": {
      if (!state.variantPreview) return state;
      const { itemId, variants } = state.variantPreview;
      const chosen = variants[action.variantIndex];
      if (!chosen) return state;

      return {
        ...state,
        items: state.items.map((item) => {
          if (item.id !== itemId || item.kind !== "artboard") return item;
          return { ...item, pageTree: chosen.tree };
        }),
        variantPreview: null,
        updatedAt: now(),
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
