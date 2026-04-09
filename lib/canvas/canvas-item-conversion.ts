import type {
  DesignNode,
} from "./design-node";
import { isDesignNodeTree } from "./compose";
import type {
  CanvasItem,
  FrameItem,
  TextItem,
  ArtboardItem,
} from "./unified-canvas-state";

/**
 * Extract a DesignNode from a canvas-level FrameItem or TextItem.
 * Strips canvas fields (x, y, zIndex, locked, kind).
 */
export function canvasItemToDesignNode(item: FrameItem | TextItem): DesignNode {
  if (item.kind === "frame") {
    return {
      id: item.id,
      type: "frame",
      name: item.name,
      style: item.style,
      children: item.children,
      isGroup: item.isGroup,
      responsiveOverrides: item.responsiveOverrides,
      hidden: item.hidden,
      componentRef: item.componentRef,
    };
  }
  // kind === "text"
  return {
    id: item.id,
    type: "text",
    name: item.name,
    style: item.style,
    content: item.content,
    responsiveOverrides: item.responsiveOverrides,
    hidden: item.hidden,
  };
}

/**
 * Create a canvas-level FrameItem or TextItem from a DesignNode.
 * Adds canvas positioning fields.
 */
export function designNodeToCanvasItem(
  node: DesignNode,
  canvasX: number,
  canvasY: number,
  zIndex: number = 0,
): FrameItem | TextItem {
  const base = {
    id: node.id,
    x: canvasX,
    y: canvasY,
    width: typeof node.style.width === "number" ? node.style.width : 240,
    height: typeof node.style.height === "number" ? node.style.height : 100,
    zIndex,
    locked: false,
  };

  if (node.type === "text") {
    return {
      ...base,
      kind: "text" as const,
      name: node.name,
      style: node.style,
      content: node.content,
      responsiveOverrides: node.responsiveOverrides,
      hidden: node.hidden,
    };
  }

  return {
    ...base,
    kind: "frame" as const,
    name: node.name,
    style: node.style,
    children: node.children ?? [],
    isGroup: node.isGroup,
    responsiveOverrides: node.responsiveOverrides,
    hidden: node.hidden,
    componentRef: node.componentRef,
  };
}

/**
 * Get the DesignNode tree root for any item that has one.
 * Returns null for items without DesignNode content (reference, note, arrow).
 */
export function getNodeTree(item: CanvasItem): DesignNode | null {
  if (item.kind === "artboard") {
    const artboard = item as ArtboardItem;
    return isDesignNodeTree(artboard.pageTree) ? artboard.pageTree : null;
  }
  if (item.kind === "frame" || item.kind === "text") {
    return canvasItemToDesignNode(item as FrameItem | TextItem);
  }
  return null;
}

/**
 * Write an updated DesignNode tree back to a canvas item.
 * For artboards: updates pageTree.
 * For frame/text: merges DesignNode fields back into the item + syncs width/height.
 */
export function withUpdatedTree(item: CanvasItem, updatedTree: DesignNode): CanvasItem {
  if (item.kind === "artboard") {
    return { ...item, pageTree: updatedTree } as ArtboardItem;
  }

  if (item.kind === "frame") {
    const width = typeof updatedTree.style.width === "number"
      ? updatedTree.style.width
      : item.width;
    const height = typeof updatedTree.style.height === "number"
      ? updatedTree.style.height
      : item.height;

    return {
      ...item,
      name: updatedTree.name,
      style: updatedTree.style,
      children: updatedTree.children ?? [],
      isGroup: updatedTree.isGroup,
      responsiveOverrides: updatedTree.responsiveOverrides,
      hidden: updatedTree.hidden,
      componentRef: updatedTree.componentRef,
      width,
      height,
    } as FrameItem;
  }

  if (item.kind === "text") {
    const width = typeof updatedTree.style.width === "number"
      ? updatedTree.style.width
      : item.width;
    const height = typeof updatedTree.style.height === "number"
      ? updatedTree.style.height
      : item.height;

    return {
      ...item,
      name: updatedTree.name,
      style: updatedTree.style,
      content: updatedTree.content,
      responsiveOverrides: updatedTree.responsiveOverrides,
      hidden: updatedTree.hidden,
      width,
      height,
    } as TextItem;
  }

  return item;
}

/**
 * Check if a canvas item has DesignNode content that can be edited.
 */
export function isEditableItem(item: CanvasItem): item is ArtboardItem | FrameItem | TextItem {
  return item.kind === "artboard" || item.kind === "frame" || item.kind === "text";
}
