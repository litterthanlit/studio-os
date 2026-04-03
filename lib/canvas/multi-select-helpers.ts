/**
 * Multi-Select Helpers — pure functions for selection normalization,
 * bounding-box computation, alignment, distribution, and tree queries.
 *
 * All functions operate on DesignNode trees. They use findDesignNodeById
 * and findDesignNodeParent from design-node.ts for tree traversal.
 */

import type { DesignNode } from "./design-node";
import { findDesignNodeById, findDesignNodeParent } from "./design-node";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AlignDirection =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export type DistributeAxis = "horizontal" | "vertical";

// ─── normalizeSelection ─────────────────────────────────────────────────────

/**
 * Remove any node whose ancestor is also in the selection set.
 * This prevents double-counting when operating on a selection that
 * includes both a parent and its children.
 */
export function normalizeSelection(
  selectedNodeIds: string[],
  tree: DesignNode
): string[] {
  const idSet = new Set(selectedNodeIds);

  return selectedNodeIds.filter((id) => {
    // Walk up from this node's parent; if any ancestor is in the set, exclude this node
    let current = findDesignNodeParent(tree, id);
    while (current) {
      if (idSet.has(current.id)) return false;
      if (current.id === tree.id) break;
      current = findDesignNodeParent(tree, current.id);
    }
    return true;
  });
}

// ─── getSelectionBounds ─────────────────────────────────────────────────────

/**
 * Compute the bounding box that encloses all nodes in the set.
 * Uses style.x, style.y, style.width, style.height from each node.
 * Returns null if no valid bounds can be computed.
 */
export function getSelectionBounds(
  nodeIds: string[],
  tree: DesignNode
): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  for (const id of nodeIds) {
    const node = findDesignNodeById(tree, id);
    if (!node) continue;

    const x = node.style.x ?? 0;
    const y = node.style.y ?? 0;
    const w = typeof node.style.width === "number" ? node.style.width : 0;
    const h = typeof node.style.height === "number" ? node.style.height : 0;

    if (w === 0 && h === 0) continue;

    found = true;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  if (!found) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ─── allAbsolute ────────────────────────────────────────────────────────────

/**
 * Check if all nodes in the set have position: absolute.
 */
export function allAbsolute(
  nodeIds: string[],
  tree: DesignNode
): boolean {
  for (const id of nodeIds) {
    const node = findDesignNodeById(tree, id);
    if (!node) return false;
    if (node.style.position !== "absolute") return false;
  }
  return nodeIds.length > 0;
}

// ─── allSameParent ──────────────────────────────────────────────────────────

/**
 * Check if all nodes share the same parent. Returns the parent or null.
 */
export function allSameParent(
  nodeIds: string[],
  tree: DesignNode
): DesignNode | null {
  if (nodeIds.length === 0) return null;

  const firstParent = findDesignNodeParent(tree, nodeIds[0]);
  if (!firstParent) return null;

  for (let i = 1; i < nodeIds.length; i++) {
    const parent = findDesignNodeParent(tree, nodeIds[i]);
    if (!parent || parent.id !== firstParent.id) return null;
  }

  return firstParent;
}

// ─── findLCA ────────────────────────────────────────────────────────────────

/**
 * Find the lowest common ancestor of all nodes in the set.
 * Returns null if any node is not found in the tree.
 */
export function findLCA(
  nodeIds: string[],
  tree: DesignNode
): DesignNode | null {
  if (nodeIds.length === 0) return null;
  if (nodeIds.length === 1) {
    return findDesignNodeParent(tree, nodeIds[0]);
  }

  // Build ancestor path for each node (from node up to root)
  function getAncestorPath(nodeId: string): string[] {
    const path: string[] = [nodeId];
    let current = findDesignNodeParent(tree, nodeId);
    while (current) {
      path.unshift(current.id);
      if (current.id === tree.id) break;
      current = findDesignNodeParent(tree, current.id);
    }
    return path;
  }

  const paths = nodeIds.map(getAncestorPath);

  // Verify all nodes were found (each path should start with root)
  for (const path of paths) {
    if (path.length === 0 || path[0] !== tree.id) return null;
  }

  // Walk paths in parallel to find the deepest common ancestor
  let lcaId = tree.id;
  const minLen = Math.min(...paths.map((p) => p.length));

  for (let i = 0; i < minLen; i++) {
    const id = paths[0][i];
    if (paths.every((p) => p[i] === id)) {
      lcaId = id;
    } else {
      break;
    }
  }

  return findDesignNodeById(tree, lcaId);
}

/**
 * Get the depth (distance from root) of a node in the tree.
 * Returns -1 if the node is not found.
 */
export function getNodeDepth(
  nodeId: string,
  tree: DesignNode
): number {
  if (tree.id === nodeId) return 0;

  let depth = 0;
  let current = findDesignNodeParent(tree, nodeId);
  if (!current) return -1;

  depth = 1;
  while (current && current.id !== tree.id) {
    current = findDesignNodeParent(tree, current.id);
    depth++;
  }

  return current ? depth : -1;
}

// ─── computeAlignment ───────────────────────────────────────────────────────

/**
 * Compute new x/y positions for aligning nodes along a direction.
 * Returns a map of nodeId → { x, y } with updated positions.
 * Only the axis relevant to the direction is changed.
 */
export function computeAlignment(
  nodeIds: string[],
  tree: DesignNode,
  direction: AlignDirection
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();

  if (nodeIds.length < 2) return result;

  // Gather current bounds for each node
  const nodes: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
  for (const id of nodeIds) {
    const node = findDesignNodeById(tree, id);
    if (!node) continue;
    nodes.push({
      id,
      x: node.style.x ?? 0,
      y: node.style.y ?? 0,
      w: typeof node.style.width === "number" ? node.style.width : 0,
      h: typeof node.style.height === "number" ? node.style.height : 0,
    });
  }

  if (nodes.length < 2) return result;

  switch (direction) {
    case "left": {
      const minX = Math.min(...nodes.map((n) => n.x));
      for (const n of nodes) {
        result.set(n.id, { x: minX, y: n.y });
      }
      break;
    }
    case "center": {
      const minX = Math.min(...nodes.map((n) => n.x));
      const maxRight = Math.max(...nodes.map((n) => n.x + n.w));
      const centerX = (minX + maxRight) / 2;
      for (const n of nodes) {
        result.set(n.id, { x: centerX - n.w / 2, y: n.y });
      }
      break;
    }
    case "right": {
      const maxRight = Math.max(...nodes.map((n) => n.x + n.w));
      for (const n of nodes) {
        result.set(n.id, { x: maxRight - n.w, y: n.y });
      }
      break;
    }
    case "top": {
      const minY = Math.min(...nodes.map((n) => n.y));
      for (const n of nodes) {
        result.set(n.id, { x: n.x, y: minY });
      }
      break;
    }
    case "middle": {
      const minY = Math.min(...nodes.map((n) => n.y));
      const maxBottom = Math.max(...nodes.map((n) => n.y + n.h));
      const centerY = (minY + maxBottom) / 2;
      for (const n of nodes) {
        result.set(n.id, { x: n.x, y: centerY - n.h / 2 });
      }
      break;
    }
    case "bottom": {
      const maxBottom = Math.max(...nodes.map((n) => n.y + n.h));
      for (const n of nodes) {
        result.set(n.id, { x: n.x, y: maxBottom - n.h });
      }
      break;
    }
  }

  return result;
}

// ─── computeDistribution ────────────────────────────────────────────────────

/**
 * Compute new positions for evenly distributing nodes along an axis.
 * Requires 3+ nodes. Returns a map of nodeId → { x, y }.
 */
export function computeDistribution(
  nodeIds: string[],
  tree: DesignNode,
  axis: DistributeAxis
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();

  if (nodeIds.length < 3) return result;

  // Gather current positions
  const nodes: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
  for (const id of nodeIds) {
    const node = findDesignNodeById(tree, id);
    if (!node) continue;
    nodes.push({
      id,
      x: node.style.x ?? 0,
      y: node.style.y ?? 0,
      w: typeof node.style.width === "number" ? node.style.width : 0,
      h: typeof node.style.height === "number" ? node.style.height : 0,
    });
  }

  if (nodes.length < 3) return result;

  if (axis === "horizontal") {
    // Sort by x position
    nodes.sort((a, b) => a.x - b.x);

    // Total width of all objects
    const totalWidth = nodes.reduce((sum, n) => sum + n.w, 0);
    // Available space between first.x and last.x + last.w
    const firstX = nodes[0].x;
    const lastRight = nodes[nodes.length - 1].x + nodes[nodes.length - 1].w;
    const totalSpace = lastRight - firstX;
    const gap = (totalSpace - totalWidth) / (nodes.length - 1);

    let currentX = firstX;
    for (const n of nodes) {
      result.set(n.id, { x: currentX, y: n.y });
      currentX += n.w + gap;
    }
  } else {
    // Sort by y position
    nodes.sort((a, b) => a.y - b.y);

    const totalHeight = nodes.reduce((sum, n) => sum + n.h, 0);
    const firstY = nodes[0].y;
    const lastBottom = nodes[nodes.length - 1].y + nodes[nodes.length - 1].h;
    const totalSpace = lastBottom - firstY;
    const gap = (totalSpace - totalHeight) / (nodes.length - 1);

    let currentY = firstY;
    for (const n of nodes) {
      result.set(n.id, { x: n.x, y: currentY });
      currentY += n.h + gap;
    }
  }

  return result;
}
