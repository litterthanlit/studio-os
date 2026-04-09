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

function findDropTargetFrameId(
  tree: DesignNode,
  clientX: number,
  clientY: number,
  dragNodeId: string
): string | null {
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const domEl of elements) {
    const he = domEl as HTMLElement;
    const id = he.closest("[data-node-id]")?.getAttribute("data-node-id");
    if (!id || id === dragNodeId) continue;
    const node = findDesignNodeById(tree, id);
    if (!node) continue;
    if (node.type !== "frame" && !node.isGroup) continue;
    if (isUnderSubtree(tree, dragNodeId, id)) continue;
    return id;
  }
  return null;
}

type Opts = {
  tree: DesignNode;
  itemId: string | null;
  selectedNodeIds: string[];
  interactive: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
};

const DROP_RING = "inset 0 0 0 2px rgba(209, 228, 252, 0.5)";

/**
 * Alt (Option) + drag from a selected node, release over a frame/group to reparent (append as last child).
 */
export function useCanvasReparentAltDrag({
  tree,
  itemId,
  selectedNodeIds,
  interactive,
  containerRef,
}: Opts) {
  const canvasCtx = useContext(CanvasContext);
  const dispatch = canvasCtx?.dispatch ?? null;

  useEffect(() => {
    if (!interactive || !itemId || !dispatch) return;
    const el = containerRef.current;
    if (!el) return;

    let draggingId: string | null = null;
    let highlightEl: HTMLElement | null = null;
    let capturedPointerId: number | null = null;

    const clearHighlight = () => {
      if (highlightEl) {
        highlightEl.style.boxShadow = "";
        highlightEl = null;
      }
    };

    const updateHighlight = (clientX: number, clientY: number) => {
      if (!draggingId) return;
      clearHighlight();
      const tid = findDropTargetFrameId(tree, clientX, clientY, draggingId);
      if (!tid) return;
      const wrap = el.querySelector(`[data-node-id="${tid}"]`) as HTMLElement | null;
      if (wrap) {
        wrap.style.boxShadow = DROP_RING;
        highlightEl = wrap;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!draggingId) return;
      updateHighlight(e.clientX, e.clientY);
    };

    const finishDrag = (e: PointerEvent) => {
      if (!draggingId) return;
      const dragNodeId = draggingId;
      draggingId = null;
      clearHighlight();

      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", finishDrag, true);
      document.removeEventListener("pointercancel", finishDrag, true);

      if (capturedPointerId !== null) {
        try {
          el.releasePointerCapture(capturedPointerId);
        } catch {
          /* noop */
        }
        capturedPointerId = null;
      }

      const targetFrameId = findDropTargetFrameId(tree, e.clientX, e.clientY, dragNodeId);
      if (!targetFrameId) return;

      const parent = findDesignNodeParent(tree, dragNodeId);
      const sourceParentId =
        parent && parent.id === tree.id ? undefined : parent?.id;

      const target = findDesignNodeById(tree, targetFrameId);
      if (!target) return;
      const targetIndex = target.children?.length ?? 0;

      dispatch({
        type: "REPARENT_NODE",
        itemId,
        nodeId: dragNodeId,
        sourceParentId,
        targetParentId: targetFrameId,
        targetIndex,
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!e.altKey || e.button !== 0) return;
      const nodeEl = (e.target as HTMLElement).closest("[data-node-id]");
      const nid = nodeEl?.getAttribute("data-node-id");
      if (!nid || !selectedNodeIds.includes(nid)) return;

      e.preventDefault();
      e.stopPropagation();
      draggingId = nid;
      capturedPointerId = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }

      document.addEventListener("pointermove", onPointerMove, true);
      document.addEventListener("pointerup", finishDrag, true);
      document.addEventListener("pointercancel", finishDrag, true);
    };

    el.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      clearHighlight();
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", finishDrag, true);
      document.removeEventListener("pointercancel", finishDrag, true);
      el.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [tree, itemId, selectedNodeIds, interactive, dispatch, containerRef]);
}
