// lib/canvas/nested-selection.ts
// Track 4: Framer-like direct nested selection algorithms
// Hit testing, contextual filtering, selection cycling, and sibling cycling

// TODO: For documents with >500 nodes, implement spatial indexing
// (quadtree or R-tree) to avoid full tree traversal on every Cmd+Click.
// Threshold: if getFlatNodeCount(root) > 500, use cached bounds map.

import type { DesignNode } from "./design-node";

// =============================================================================
// Coordinate Transformation
// =============================================================================

/**
 * Transform screen coordinates to artboard coordinates.
 * Accounts for zoom level and scroll/pan offset.
 */
export function screenToArtboard(
  screenX: number,
  screenY: number,
  zoom: number,
  scrollX: number,
  scrollY: number
): { x: number; y: number } {
  return {
    x: (screenX - scrollX) / zoom,
    y: (screenY - scrollY) / zoom,
  };
}

// =============================================================================
// Hit Testing
// =============================================================================

/**
 * Get all nodes whose bounds contain the given artboard point.
 * Returns nodes sorted by depth (deepest first) for proper hit priority.
 */
export function getNodesAtPoint(
  root: DesignNode,
  artboardX: number,
  artboardY: number
): DesignNode[] {
  const hits: DesignNode[] = [];

  traverseDesignNode(root, (node) => {
    // Skip locked nodes
    if ((node as unknown as { locked?: boolean }).locked) {
      return;
    }

    const bounds = getNodeBounds(node);

    // Skip nodes with no valid bounds
    if (bounds.width === 0 && bounds.height === 0) {
      return;
    }

    if (pointInRect(artboardX, artboardY, bounds)) {
      hits.push(node);
    }
  });

  // Sort by depth (deepest first) so Cmd+Click cycles shallowest → deepest
  hits.sort((a, b) => getNodeDepth(b, root) - getNodeDepth(a, root));

  return hits;
}

// =============================================================================
// Contextual Filtering
// =============================================================================

/**
 * Filter hit nodes based on the current selection context.
 *
 * - If no context: return only direct children of root (top-level nodes)
 * - If context exists: return hits that are descendants of context node
 *   (or the context node itself if it's in the hit list)
 */
export function getContextualHits(
  hits: DesignNode[],
  contextNodeId: string | null,
  root: DesignNode
): DesignNode[] {
  if (hits.length === 0) {
    return [];
  }

  // No context: only direct children of root are selectable
  if (contextNodeId === null) {
    const rootChildren = root.children ?? [];
    const rootChildIds = new Set(rootChildren.map((c) => c.id));
    return hits.filter((node) => rootChildIds.has(node.id));
  }

  // With context: filter to descendants of context node
  const contextNode = findNodeById(root, contextNodeId);
  if (!contextNode) {
    // Context node no longer exists - fallback to root children
    const rootChildren = root.children ?? [];
    const rootChildIds = new Set(rootChildren.map((c) => c.id));
    return hits.filter((node) => rootChildIds.has(node.id));
  }

  // Return hits that are the context node itself or its descendants
  return hits.filter(
    (node) =>
      node.id === contextNodeId || isDescendantOf(node, contextNode)
  );
}

// =============================================================================
// Selection Cycling
// =============================================================================

/**
 * Cycle through depth levels of hit nodes.
 *
 * - If nothing selected: return the deepest hit (first in array)
 * - If currently selected is in hits: return next hit, wrapping to start
 * - If currently selected is not in hits: return the deepest hit
 */
export function cycleSelection(
  currentSelection: string | null,
  hits: DesignNode[]
): string | null {
  if (hits.length === 0) {
    return null;
  }

  if (currentSelection === null) {
    // Nothing selected: pick the deepest (first in hits array)
    return hits[0].id;
  }

  const currentIndex = hits.findIndex((node) => node.id === currentSelection);

  if (currentIndex === -1) {
    // Current selection not in hits: pick the deepest
    return hits[0].id;
  }

  // Move to next hit, wrapping around
  const nextIndex = (currentIndex + 1) % hits.length;
  return hits[nextIndex].id;
}

// =============================================================================
// Sibling Cycling
// =============================================================================

/**
 * Cycle to the next or previous sibling within a parent container.
 *
 * - Returns the sibling's ID, wrapping around if at the end
 * - Returns null if parent has no children or current selection not found
 */
export function cycleSiblingSelection(
  currentSelection: string,
  parent: DesignNode,
  direction: "next" | "previous"
): string | null {
  const children = parent.children ?? [];

  if (children.length === 0) {
    return null;
  }

  const currentIndex = children.findIndex((child) => child.id === currentSelection);

  if (currentIndex === -1) {
    return null;
  }

  let nextIndex: number;

  if (direction === "next") {
    nextIndex = (currentIndex + 1) % children.length;
  } else {
    nextIndex = (currentIndex - 1 + children.length) % children.length;
  }

  return children[nextIndex].id;
}

// =============================================================================
// Tree Utilities
// =============================================================================

/**
 * Calculate the depth of a node in the tree (root = 0, direct children = 1, etc.)
 */
export function getNodeDepth(node: DesignNode, root: DesignNode): number {
  let depth = 0;
  let current: DesignNode | null = node;

  while (current && current.id !== root.id) {
    const parent = getParent(current, root);
    if (!parent) break;
    current = parent;
    depth++;
  }

  return depth;
}

/**
 * Find a node by ID anywhere in the tree.
 */
export function findNodeById(root: DesignNode, id: string): DesignNode | null {
  if (root.id === id) {
    return root;
  }

  for (const child of root.children ?? []) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Find the parent of a target node in the tree.
 */
export function getParent(target: DesignNode, root: DesignNode): DesignNode | null {
  for (const child of root.children ?? []) {
    if (child.id === target.id) {
      return root;
    }

    const parentInSubtree = getParent(target, child);
    if (parentInSubtree) {
      return parentInSubtree;
    }
  }

  return null;
}

/**
 * Check if target is a descendant of ancestor (direct or indirect).
 */
export function isDescendantOf(target: DesignNode, ancestor: DesignNode): boolean {
  let current = getParent(target, ancestor);

  while (current) {
    if (current.id === ancestor.id) {
      return true;
    }
    current = getParent(current, ancestor);
  }

  return false;
}

/**
 * Traverse the entire DesignNode tree, calling callback for each node.
 */
export function traverseDesignNode(
  root: DesignNode,
  callback: (node: DesignNode) => void
): void {
  callback(root);

  for (const child of root.children ?? []) {
    traverseDesignNode(child, callback);
  }
}

// =============================================================================
// Geometry Utilities
// =============================================================================

/**
 * Check if a point is inside a rectangle.
 */
export function pointInRect(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

/**
 * Get the bounds of a DesignNode from its style properties.
 *
 * Note: For "hug" or "fill" sizing, returns 0,0,0,0 bounds since we can't
 * compute actual dimensions without layout context. In production, this
 * should query the rendered DOM element for actual bounds.
 */
export function getNodeBounds(node: DesignNode): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { style } = node;

  // Position: default to 0,0 if not specified
  const x = style.x ?? 0;
  const y = style.y ?? 0;

  // Size: handle explicit numbers vs hug/fill
  let width = 0;
  let height = 0;

  if (typeof style.width === "number") {
    width = style.width;
  }
  // For "hug" | "fill", width remains 0 - would need DOM measurement

  if (typeof style.height === "number") {
    height = style.height;
  }
  // For "hug" | "fill", height remains 0 - would need DOM measurement

  return { x, y, width, height };
}

/**
 * Count total nodes in the tree (flat count).
 */
export function getFlatNodeCount(root: DesignNode): number {
  let count = 0;

  traverseDesignNode(root, () => {
    count++;
  });

  return count;
}
