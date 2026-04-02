"use client";

/**
 * useSnapGuides — smart snap guides for drag/resize alignment.
 *
 * Calculates snap targets from sibling nodes at the same tree level.
 * When the dragged node's edge or center is within SNAP_THRESHOLD of any
 * sibling edge or center, snaps to it and returns active guide lines.
 *
 * Performance: sibling bounds are cached when drag starts (isDragging flips true).
 * Only guide intersection math runs during pointermove.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { type DesignNode } from "@/lib/canvas/design-node";

// ── Types ─────────────────────────────────────────────────────────────

export type SnapGuide = {
  axis: "x" | "y";
  position: number; // px from container edge
};

type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SnapTarget = {
  axis: "x" | "y";
  position: number;
};

type DragSession = {
  nodeId: string;
  parentOffsetX: number;
  parentOffsetY: number;
  siblingTargets: SnapTarget[];
};

// ── Constants ─────────────────────────────────────────────────────────

const SNAP_THRESHOLD = 5; // px

// ── Hook ──────────────────────────────────────────────────────────────

export function useSnapGuides(opts: {
  tree: DesignNode;
  draggedNodeId: string | null;
  isDragging: boolean;
}): {
  snapPosition: (
    x: number,
    y: number,
    width: number,
    height: number,
    nodeId?: string | null
  ) => { x: number; y: number };
  activeGuides: SnapGuide[];
} {
  const { tree, draggedNodeId, isDragging } = opts;

  const treeRef = useRef(tree);
  treeRef.current = tree;

  const dragSessionRef = useRef<DragSession | null>(null);
  const activeGuidesRef = useRef<SnapGuide[]>([]);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  const setGuides = useCallback((nextGuides: SnapGuide[]) => {
    const prevGuides = activeGuidesRef.current;
    const unchanged =
      prevGuides.length === nextGuides.length &&
      prevGuides.every(
        (guide, index) =>
          guide.axis === nextGuides[index]?.axis && guide.position === nextGuides[index]?.position
      );
    if (unchanged) return;
    activeGuidesRef.current = nextGuides;
    setActiveGuides(nextGuides);
  }, []);

  useEffect(() => {
    if (!isDragging || !draggedNodeId) {
      dragSessionRef.current = null;
      setGuides([]);
    }
  }, [draggedNodeId, isDragging, setGuides]);

  const ensureDragSession = useCallback((nodeId: string): DragSession | null => {
    const existing = dragSessionRef.current;
    if (existing && existing.nodeId === nodeId) {
      return existing;
    }

    const path = findNodePath(treeRef.current, nodeId);
    if (!path || path.length < 2) return null;

    const parentPath = path.slice(0, -1);
    const parent = parentPath[parentPath.length - 1];
    const parentOffsetX = sumAbsoluteOffsets(parentPath, parentPath.length - 1);
    const parentOffsetY = sumAbsoluteOffsets(parentPath, parentPath.length - 1, "y");
    const siblings = (parent.children ?? []).filter((child) => child.id !== nodeId);
    const siblingTargets: SnapTarget[] = [];

    for (const sibling of siblings) {
      const box = getAbsoluteBoundingBox([...parentPath, sibling]);
      if (!box) continue;

      siblingTargets.push({ axis: "x", position: box.x });
      siblingTargets.push({ axis: "x", position: box.x + box.width / 2 });
      siblingTargets.push({ axis: "x", position: box.x + box.width });
      siblingTargets.push({ axis: "y", position: box.y });
      siblingTargets.push({ axis: "y", position: box.y + box.height / 2 });
      siblingTargets.push({ axis: "y", position: box.y + box.height });
    }

    const session = {
      nodeId,
      parentOffsetX,
      parentOffsetY,
      siblingTargets,
    };
    dragSessionRef.current = session;
    return session;
  }, []);

  // snapPosition: takes proposed position, returns snapped position + updates activeGuides
  const snapPosition = useCallback(
    (x: number, y: number, width: number, height: number, nodeId?: string | null): { x: number; y: number } => {
      if (nodeId === null) {
        dragSessionRef.current = null;
        setGuides([]);
        return { x, y };
      }
      const activeNodeId = nodeId ?? draggedNodeId ?? dragSessionRef.current?.nodeId;
      if (!activeNodeId) {
        setGuides([]);
        return { x, y };
      }

      const session = ensureDragSession(activeNodeId);
      if (!session || session.siblingTargets.length === 0) {
        setGuides([]);
        return { x, y };
      }

      const rootX = x + session.parentOffsetX;
      const rootY = y + session.parentOffsetY;

      // Dragged node's snap edges
      const dragEdgesX = [rootX, rootX + width / 2, rootX + width];
      const dragEdgesY = [rootY, rootY + height / 2, rootY + height];

      let snappedX = rootX;
      let snappedY = rootY;
      const guides: SnapGuide[] = [];

      // Find closest X snap
      let bestDxAbs = SNAP_THRESHOLD + 1;
      let bestSnapX: number | null = null;
      let bestGuideX: number | null = null;

      for (const target of session.siblingTargets) {
        if (target.axis !== "x") continue;
        for (const edge of dragEdgesX) {
          const dist = Math.abs(edge - target.position);
          if (dist < bestDxAbs) {
            bestDxAbs = dist;
            bestSnapX = rootX + (target.position - edge);
            bestGuideX = target.position;
          }
        }
      }

      if (bestSnapX !== null && bestGuideX !== null && bestDxAbs <= SNAP_THRESHOLD) {
        snappedX = bestSnapX;
        guides.push({ axis: "x", position: bestGuideX });
      }

      // Find closest Y snap
      let bestDyAbs = SNAP_THRESHOLD + 1;
      let bestSnapY: number | null = null;
      let bestGuideY: number | null = null;

      for (const target of session.siblingTargets) {
        if (target.axis !== "y") continue;
        for (const edge of dragEdgesY) {
          const dist = Math.abs(edge - target.position);
          if (dist < bestDyAbs) {
            bestDyAbs = dist;
            bestSnapY = rootY + (target.position - edge);
            bestGuideY = target.position;
          }
        }
      }

      if (bestSnapY !== null && bestGuideY !== null && bestDyAbs <= SNAP_THRESHOLD) {
        snappedY = bestSnapY;
        guides.push({ axis: "y", position: bestGuideY });
      }

      setGuides(guides);
      return {
        x: snappedX - session.parentOffsetX,
        y: snappedY - session.parentOffsetY,
      };
    },
    [draggedNodeId, ensureDragSession, setGuides]
  );

  return {
    snapPosition,
    activeGuides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

function findNodePath(root: DesignNode, targetId: string, trail: DesignNode[] = []): DesignNode[] | null {
  const nextTrail = [...trail, root];
  if (root.id === targetId) return nextTrail;
  for (const child of root.children ?? []) {
    const match = findNodePath(child, targetId, nextTrail);
    if (match) return match;
  }
  return null;
}

function sumAbsoluteOffsets(
  path: DesignNode[],
  endExclusive: number,
  axis: "x" | "y" = "x"
): number {
  let total = 0;
  for (let index = 0; index < endExclusive; index += 1) {
    const node = path[index];
    const value = axis === "x" ? node.style.x : node.style.y;
    if (typeof value === "number") {
      total += value;
    }
  }
  return total;
}

function getAbsoluteBoundingBox(path: DesignNode[]): BoundingBox | null {
  const node = path[path.length - 1];
  const x = sumAbsoluteOffsets(path, path.length, "x");
  const y = sumAbsoluteOffsets(path, path.length, "y");
  const measured = getRenderedSize(node.id);
  const width =
    typeof node.style.width === "number" ? node.style.width : measured?.width ?? 0;
  const height =
    typeof node.style.height === "number" ? node.style.height : measured?.height ?? 0;

  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function getRenderedSize(nodeId: string): { width: number; height: number } | null {
  if (typeof document === "undefined") return null;
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-node-id="${nodeId}"]`)
  );
  if (candidates.length === 0) return null;

  const rect = candidates
    .map((candidate) => candidate.getBoundingClientRect())
    .find((candidateRect) => candidateRect.width > 0 && candidateRect.height > 0);

  if (!rect) return null;
  return { width: rect.width, height: rect.height };
}
