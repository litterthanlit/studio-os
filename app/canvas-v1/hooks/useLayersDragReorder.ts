"use client";

import * as React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type UseLayersDragReorderOptions = {
  onReorder: (nodeId: string, parentId: string | undefined, newIndex: number) => void;
  selectedNodeIds: string[];
  onCollapseToSingle?: (artboardId: string, nodeId: string) => void;
};

export type DropTarget = {
  parentId: string;
  index: number;
};

export type UseLayersDragReorderReturn = {
  draggedId: string | null;
  dropTarget: DropTarget | null;
  handlePointerDown: (e: React.PointerEvent, nodeId: string, parentId: string) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  handlePointerCancel: () => void;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const HOLD_DELAY_MS = 150;
const MOVE_THRESHOLD_PX = 4;

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useLayersDragReorder(
  opts: UseLayersDragReorderOptions
): UseLayersDragReorderReturn {
  const { onReorder, selectedNodeIds } = opts;

  // Drag state
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<DropTarget | null>(null);

  // Refs for the hold-to-drag activation
  const holdTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const pendingRef = React.useRef<{
    nodeId: string;
    parentId: string;
  } | null>(null);
  const isDraggingRef = React.useRef(false);
  const draggedParentRef = React.useRef<string | null>(null);

  // ── Cleanup helper ──

  const cleanup = React.useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    startPosRef.current = null;
    pendingRef.current = null;
    isDraggingRef.current = false;
    draggedParentRef.current = null;
    setDraggedId(null);
    setDropTarget(null);
  }, []);

  // ── Pointer Down ──

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent, nodeId: string, parentId: string) => {
      // Only primary button
      if (e.button !== 0) return;

      // Store the starting position and pending node info
      startPosRef.current = { x: e.clientX, y: e.clientY };
      pendingRef.current = { nodeId, parentId };

      // Start hold timer — when it fires, activate drag mode
      holdTimerRef.current = setTimeout(() => {
        if (!pendingRef.current) return;

        const { nodeId: dragNodeId, parentId: dragParentId } = pendingRef.current;

        // Activate drag
        isDraggingRef.current = true;
        draggedParentRef.current = dragParentId;
        setDraggedId(dragNodeId);
      }, HOLD_DELAY_MS);
    },
    [selectedNodeIds]
  );

  // ── Pointer Move ──

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      // Before drag activation: check if moved too far (cancel hold timer)
      if (!isDraggingRef.current && startPosRef.current && holdTimerRef.current) {
        const dx = e.clientX - startPosRef.current.x;
        const dy = e.clientY - startPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD_PX) {
          // Moved too far before hold timer fired — this is a click/normal interaction
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          pendingRef.current = null;
          startPosRef.current = null;
          return;
        }
      }

      // Not in active drag mode yet
      if (!isDraggingRef.current || !draggedParentRef.current) return;

      // Find the row element under the pointer
      const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (!elementUnder) {
        setDropTarget(null);
        return;
      }

      // Walk up to find the element with data-layer-node-id
      const rowEl = (elementUnder as HTMLElement).closest?.(
        "[data-layer-node-id]"
      ) as HTMLElement | null;

      if (!rowEl) {
        setDropTarget(null);
        return;
      }

      const targetNodeId = rowEl.getAttribute("data-layer-node-id");
      const targetParentId = rowEl.getAttribute("data-layer-parent-id");
      const targetIndexStr = rowEl.getAttribute("data-layer-index");

      // Same-parent constraint
      if (!targetParentId || targetParentId !== draggedParentRef.current) {
        setDropTarget(null);
        return;
      }

      // Don't drop on self
      if (targetNodeId === draggedId) {
        setDropTarget(null);
        return;
      }

      const targetIndex = targetIndexStr ? parseInt(targetIndexStr, 10) : -1;
      if (targetIndex < 0) {
        setDropTarget(null);
        return;
      }

      // Determine above/below based on pointer Y vs row midpoint
      const rect = rowEl.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertIndex = e.clientY < midY ? targetIndex : targetIndex + 1;

      setDropTarget({
        parentId: targetParentId,
        index: insertIndex,
      });
    },
    [draggedId]
  );

  // ── Pointer Up ──

  const handlePointerUp = React.useCallback(
    (_e: React.PointerEvent) => {
      if (isDraggingRef.current && draggedId && dropTarget) {
        onReorder(draggedId, dropTarget.parentId, dropTarget.index);
      }
      cleanup();
    },
    [draggedId, dropTarget, onReorder, cleanup]
  );

  // ── Pointer Cancel ──

  const handlePointerCancel = React.useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  return {
    draggedId,
    dropTarget,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
