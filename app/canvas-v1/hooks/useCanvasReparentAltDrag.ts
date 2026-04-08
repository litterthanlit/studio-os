"use client";

import { useEffect, useContext } from "react";
import { CanvasContext } from "@/lib/canvas/canvas-context";
import { findDesignNodeById, findDesignNodeParent, type DesignNode } from "@/lib/canvas/design-node";

function isUnderSubtree(root: DesignNode, subtreeRootId: string, queryId: string): boolean {
  const start = findDesignNodeById(root, subtreeRootId);
  if (!start) return false;
  function walk(n: DesignNode): boolean {
    if (n.id === queryId) return true;
    return n.children?.some(walk) ?? false;
  }
  return walk(start);
}

type Opts = {
  tree: DesignNode;
  artboardId: string | null;
  selectedNodeIds: string[];
  interactive: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
};

/**
 * Alt (Option) + drag from a selected node, release over a frame/group to reparent (append as last child).
 */
export function useCanvasReparentAltDrag({
  tree,
  artboardId,
  selectedNodeIds,
  interactive,
  containerRef,
}: Opts) {
  const canvasCtx = useContext(CanvasContext);
  const dispatch = canvasCtx?.dispatch ?? null;

  useEffect(() => {
    if (!interactive || !artboardId || !dispatch) return;
    const el = containerRef.current;
    if (!el) return;

    let draggingId: string | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (!e.altKey || e.button !== 0) return;
      const nodeEl = (e.target as HTMLElement).closest("[data-node-id]");
      const nid = nodeEl?.getAttribute("data-node-id");
      if (!nid || !selectedNodeIds.includes(nid)) return;

      e.preventDefault();
      e.stopPropagation();
      draggingId = nid;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!draggingId) return;
      const dragNodeId = draggingId;
      draggingId = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }

      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let targetFrameId: string | null = null;
      for (const domEl of elements) {
        const he = domEl as HTMLElement;
        const id = he.closest("[data-node-id]")?.getAttribute("data-node-id");
        if (!id || id === dragNodeId) continue;
        const node = findDesignNodeById(tree, id);
        if (!node) continue;
        if (node.type !== "frame" && !node.isGroup) continue;
        if (isUnderSubtree(tree, dragNodeId, id)) continue;
        targetFrameId = id;
        break;
      }

      if (!targetFrameId) return;

      const parent = findDesignNodeParent(tree, dragNodeId);
      const sourceParentId =
        parent && parent.id === tree.id ? undefined : parent?.id;

      const target = findDesignNodeById(tree, targetFrameId);
      if (!target) return;
      const targetIndex = target.children?.length ?? 0;

      dispatch({
        type: "REPARENT_NODE",
        artboardId,
        nodeId: dragNodeId,
        sourceParentId,
        targetParentId: targetFrameId,
        targetIndex,
      });
    };

    el.addEventListener("pointerdown", onPointerDown, true);
    el.addEventListener("pointerup", onPointerUp, true);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown, true);
      el.removeEventListener("pointerup", onPointerUp, true);
    };
  }, [tree, artboardId, selectedNodeIds, interactive, dispatch, containerRef]);
}
