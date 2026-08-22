import type { DesignNode, DesignNodeContent, DesignNodeStyle } from "@/lib/canvas/design-node";
import { findDesignNodeById } from "@/lib/canvas/design-node";
import { isDesignNodeTree } from "@/lib/canvas/compose";
import {
  sanitizeUserStyle,
  validateAndNormalizeDesignSectionTree,
  validateAndNormalizeDesignTree,
} from "@/lib/canvas/design-tree-validator";
import { getNodeTree, withUpdatedTree } from "@/lib/canvas/canvas-item-conversion";
import type {
  ArtboardItem,
  Breakpoint,
  CanvasItem,
  FrameItem,
  NoteItem,
  ReferenceItem,
  UnifiedCanvasState,
} from "@/lib/canvas/unified-canvas-state";
import { createEmptyCanvas } from "@/lib/canvas/unified-canvas-state";
import { stripCanvasForPersistence } from "@/lib/canvas/canvas-convex-sync";

export type CanvasAgentOperation =
  | {
      type: "add_artboard";
      name: string;
      breakpoint: Breakpoint;
      tree: unknown;
      x?: number;
      y?: number;
      siteId?: string;
      screenRole?: string;
      screenPurpose?: string;
    }
  | {
      type: "replace_artboard_tree";
      artboardId: string;
      tree: unknown;
    }
  | {
      type: "add_reference";
      imageUrl: string;
      title?: string;
      source?: ReferenceItem["source"];
    }
  | {
      type: "patch_node";
      itemId: string;
      nodeId: string;
      style?: Partial<DesignNodeStyle>;
      content?: Partial<DesignNodeContent>;
      name?: string;
    }
  | {
      type: "move_item";
      itemId: string;
      x: number;
      y: number;
    }
  | {
      type: "set_selection";
      activeItemId?: string | null;
      selectedNodeId?: string | null;
      selectedNodeIds?: string[];
    }
  | {
      type: "delete_item";
      itemId: string;
    }
  | {
      type: "rename_item";
      itemId: string;
      name: string;
    };

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  desktop: 1440,
  mobile: 375,
};

function itemName(item: CanvasItem): string | null {
  if (item.kind === "artboard" || item.kind === "frame" || item.kind === "text") return item.name;
  if (item.kind === "note") return item.text.slice(0, 40) || null;
  if (item.kind === "reference") return item.title ?? null;
  return null;
}

function updateDesignNodeInTree(
  node: DesignNode,
  targetId: string,
  updater: (current: DesignNode) => DesignNode,
): DesignNode {
  if (node.id === targetId) return updater(node);
  if (!node.children?.length) return node;
  return {
    ...node,
    children: node.children.map((child) => updateDesignNodeInTree(child, targetId, updater)),
  };
}

function validateItemTree(
  item: CanvasItem,
  tree: DesignNode,
): { ok: true; tree: DesignNode } | { ok: false; reason: string } {
  if (item.kind === "artboard") {
    return validateAndNormalizeDesignTree(tree);
  }
  if (item.kind === "frame") {
    return validateAndNormalizeDesignSectionTree(tree);
  }
  if (item.kind === "text") {
    if (tree.type !== "text") {
      return { ok: false, reason: "text item must remain type text" };
    }
    return { ok: true, tree };
  }
  return { ok: false, reason: `item kind ${item.kind} has no DesignNode tree` };
}

export function buildCanvasSummary(state: UnifiedCanvasState) {
  const artboards = state.items
    .filter((item): item is ArtboardItem => item.kind === "artboard")
    .map((artboard) => ({
      id: artboard.id,
      name: artboard.name,
      breakpoint: artboard.breakpoint,
      siteId: artboard.siteId,
      screenRole: artboard.screenRole ?? null,
      screenPurpose: artboard.screenPurpose ?? null,
      sectionNames: isDesignNodeTree(artboard.pageTree)
        ? (artboard.pageTree.children ?? []).map((child) => child.name || child.id)
        : [],
    }));

  const references = state.items
    .filter((item): item is ReferenceItem => item.kind === "reference")
    .map((reference) => ({
      id: reference.id,
      title: reference.title ?? null,
      imageUrl: reference.imageUrl,
      weight: reference.weight ?? "default",
    }));

  const items = state.items.map((item) => ({
    id: item.id,
    kind: item.kind,
    name: itemName(item),
    x: item.x,
    y: item.y,
  }));

  return {
    artboardCount: artboards.length,
    referenceCount: references.length,
    itemCount: items.length,
    items,
    artboards,
    references,
    selection: {
      activeItemId: state.selection.activeItemId,
      selectedNodeId: state.selection.selectedNodeId,
      selectedNodeIds: state.selection.selectedNodeIds ?? [],
      selectedItemIds: state.selection.selectedItemIds ?? [],
    },
    activeBreakpoint: state.activeBreakpoint,
    updatedAt: state.updatedAt,
  };
}

export function getCanvasNode(
  state: UnifiedCanvasState,
  itemId: string,
  nodeId: string,
): { item: { id: string; kind: CanvasItem["kind"]; name: string | null }; node: DesignNode } | null {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return null;
  const tree = getNodeTree(item);
  if (!tree) return null;
  const node = nodeId === item.id ? tree : findDesignNodeById(tree, nodeId);
  if (!node) return null;
  return {
    item: { id: item.id, kind: item.kind, name: itemName(item) },
    node,
  };
}

export function applyCanvasAgentOperations(
  inputState: UnifiedCanvasState | null,
  operations: CanvasAgentOperation[],
): { state: UnifiedCanvasState; applied: string[]; errors: string[] } {
  const state = inputState ? structuredClone(inputState) : createEmptyCanvas();
  const applied: string[] = [];
  const errors: string[] = [];

  for (const operation of operations) {
    if (operation.type === "add_artboard") {
      const validated = validateAndNormalizeDesignTree(operation.tree);
      if (!validated.ok) {
        errors.push(`add_artboard: ${validated.reason}`);
        continue;
      }

      const id = uid("artboard");
      const siteId = operation.siteId ?? uid("site");
      const breakpoint = operation.breakpoint;
      const width = BREAKPOINT_WIDTHS[breakpoint] ?? 1440;
      const maxZ = state.items.reduce((max, item) => Math.max(max, item.zIndex), 0);
      const x = operation.x ?? 120 + state.items.filter((item) => item.kind === "artboard").length * 80;
      const y = operation.y ?? 120;

      const artboard: ArtboardItem = {
        id,
        kind: "artboard",
        x,
        y,
        width,
        height: 900,
        zIndex: maxZ + 1,
        locked: false,
        siteId,
        breakpoint,
        name: operation.name,
        pageTree: validated.tree,
        ...(operation.screenRole ? { screenRole: operation.screenRole } : {}),
        ...(operation.screenPurpose ? { screenPurpose: operation.screenPurpose } : {}),
      };

      state.items.push(artboard);
      applied.push(`add_artboard:${id}`);
      continue;
    }

    if (operation.type === "replace_artboard_tree") {
      const artboard = state.items.find(
        (item): item is ArtboardItem =>
          item.kind === "artboard" && item.id === operation.artboardId,
      );
      if (!artboard) {
        errors.push(`replace_artboard_tree: artboard ${operation.artboardId} not found`);
        continue;
      }

      const validated = validateAndNormalizeDesignTree(operation.tree);
      if (!validated.ok) {
        errors.push(`replace_artboard_tree: ${validated.reason}`);
        continue;
      }

      artboard.pageTree = validated.tree;
      applied.push(`replace_artboard_tree:${operation.artboardId}`);
      continue;
    }

    if (operation.type === "add_reference") {
      const maxZ = state.items.reduce((max, item) => Math.max(max, item.zIndex), 0);
      const reference: ReferenceItem = {
        id: uid("reference"),
        kind: "reference",
        x: 40,
        y: 40 + state.items.filter((item) => item.kind === "reference").length * 24,
        width: 240,
        height: 160,
        zIndex: maxZ + 1,
        locked: false,
        imageUrl: operation.imageUrl,
        title: operation.title,
        source: operation.source ?? "url",
      };
      state.items.push(reference);
      applied.push(`add_reference:${reference.id}`);
      continue;
    }

    if (operation.type === "patch_node") {
      const itemIndex = state.items.findIndex((item) => item.id === operation.itemId);
      if (itemIndex < 0) {
        errors.push(`patch_node: item ${operation.itemId} not found`);
        continue;
      }
      const item = state.items[itemIndex]!;
      const tree = getNodeTree(item);
      if (!tree) {
        errors.push(`patch_node: item ${operation.itemId} has no DesignNode tree`);
        continue;
      }
      const target = operation.nodeId === item.id ? tree : findDesignNodeById(tree, operation.nodeId);
      if (!target) {
        errors.push(`patch_node: node ${operation.nodeId} not found`);
        continue;
      }
      const hasStyle = operation.style && Object.keys(operation.style).length > 0;
      const hasContent = operation.content && Object.keys(operation.content).length > 0;
      const name = typeof operation.name === "string" ? operation.name.trim() : undefined;
      if (!hasStyle && !hasContent && !name) {
        errors.push("patch_node: style, content, or name is required");
        continue;
      }

      const nextTree = updateDesignNodeInTree(tree, target.id, (current) => ({
        ...current,
        ...(name ? { name } : {}),
        style: hasStyle
          ? { ...current.style, ...sanitizeUserStyle(operation.style!) }
          : current.style,
        content: hasContent
          ? { ...current.content, ...operation.content }
          : current.content,
      }));

      const validated = validateItemTree(item, nextTree);
      if (!validated.ok) {
        errors.push(`patch_node: ${validated.reason}`);
        continue;
      }

      state.items[itemIndex] = withUpdatedTree(item, validated.tree);
      applied.push(`patch_node:${operation.itemId}:${operation.nodeId}`);
      continue;
    }

    if (operation.type === "move_item") {
      const item = state.items.find((entry) => entry.id === operation.itemId);
      if (!item) {
        errors.push(`move_item: item ${operation.itemId} not found`);
        continue;
      }
      if (!Number.isFinite(operation.x) || !Number.isFinite(operation.y)) {
        errors.push("move_item: x and y must be finite numbers");
        continue;
      }
      item.x = operation.x;
      item.y = operation.y;
      applied.push(`move_item:${operation.itemId}`);
      continue;
    }

    if (operation.type === "set_selection") {
      const activeItemId =
        operation.activeItemId === undefined
          ? state.selection.activeItemId
          : operation.activeItemId;
      if (activeItemId) {
        const item = state.items.find((entry) => entry.id === activeItemId);
        if (!item) {
          errors.push(`set_selection: item ${activeItemId} not found`);
          continue;
        }
        const selectedNodeId =
          operation.selectedNodeId === undefined
            ? state.selection.selectedNodeId
            : operation.selectedNodeId;
        if (selectedNodeId) {
          const tree = getNodeTree(item);
          const node =
            tree && (selectedNodeId === item.id ? tree : findDesignNodeById(tree, selectedNodeId));
          if (!node) {
            errors.push(`set_selection: node ${selectedNodeId} not found`);
            continue;
          }
        }
      }

      const selectedNodeId =
        operation.selectedNodeId === undefined
          ? state.selection.selectedNodeId
          : operation.selectedNodeId;
      const selectedNodeIds =
        operation.selectedNodeIds ??
        (selectedNodeId ? [selectedNodeId] : []);

      state.selection = {
        selectedItemIds: activeItemId ? [activeItemId] : [],
        activeItemId,
        selectedNodeId,
        selectedNodeIds,
      };
      applied.push("set_selection");
      continue;
    }

    if (operation.type === "delete_item") {
      const exists = state.items.some((item) => item.id === operation.itemId);
      if (!exists) {
        errors.push(`delete_item: item ${operation.itemId} not found`);
        continue;
      }
      state.items = state.items.filter((item) => item.id !== operation.itemId);
      if (state.selection.activeItemId === operation.itemId) {
        state.selection = {
          selectedItemIds: [],
          activeItemId: null,
          selectedNodeId: null,
          selectedNodeIds: [],
        };
      } else {
        state.selection = {
          ...state.selection,
          selectedItemIds: state.selection.selectedItemIds.filter((id) => id !== operation.itemId),
        };
      }
      applied.push(`delete_item:${operation.itemId}`);
      continue;
    }

    if (operation.type === "rename_item") {
      const name = operation.name.trim();
      if (!name) {
        errors.push("rename_item: name is required");
        continue;
      }
      const item = state.items.find((entry) => entry.id === operation.itemId);
      if (!item) {
        errors.push(`rename_item: item ${operation.itemId} not found`);
        continue;
      }
      if (item.kind === "artboard" || item.kind === "frame") {
        (item as ArtboardItem | FrameItem).name = name;
        applied.push(`rename_item:${operation.itemId}`);
        continue;
      }
      if (item.kind === "note") {
        (item as NoteItem).text = name;
        applied.push(`rename_item:${operation.itemId}`);
        continue;
      }
      errors.push(`rename_item: cannot rename ${item.kind} items`);
      continue;
    }

    errors.push(`unknown operation: ${(operation as { type?: string }).type ?? "missing type"}`);
  }

  state.updatedAt = new Date().toISOString();
  return {
    state: stripCanvasForPersistence(state),
    applied,
    errors,
  };
}

export function getArtboardTree(state: UnifiedCanvasState, artboardId: string): DesignNode | null {
  const artboard = state.items.find(
    (item): item is ArtboardItem => item.kind === "artboard" && item.id === artboardId,
  );
  if (!artboard || !isDesignNodeTree(artboard.pageTree)) return null;
  return artboard.pageTree;
}

export function extractReferenceUrls(state: UnifiedCanvasState): string[] {
  return state.items
    .filter((item): item is ReferenceItem => item.kind === "reference")
    .filter((item) => item.weight !== "muted")
    .map((item) => item.imageUrl)
    .filter(Boolean);
}
