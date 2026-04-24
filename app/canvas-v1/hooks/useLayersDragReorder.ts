"use client";

import * as React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type UseLayersDragReorderOptions = {
  onReparent: (nodeId: string, sourceParentId: string | undefined, targetParentId: string | undefined, targetIndex: number) => void;
  selectedNodeIds: string[];
  onCollapseToSingle?: (itemId: string, nodeId: string) => void;
  // Helper to get node type for valid parent checking
  getNodeType?: (nodeId: string) => { type: string; isGroup?: boolean } | null;
  // Helper to get root children count for root-level drop index calculation
  getRootChildCount?: () => number;
};

export type DropTarget = {
  parentId: string | undefined;  // undefined = root level
  index: number;
  isValidDrop: boolean;
};

export type UseLayersDragReorderReturn = {
  draggedId: string | null;
  dropTarget: DropTarget | null;
  isValidDrop: boolean;
  handlePointerDown: (e: React.PointerEvent, nodeId: string, parentId: string | undefined) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  handlePointerCancel: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const HOLD_DELAY_MS = 150;
const MOVE_THRESHOLD_PX = 4;
const ROW_HEIGHT = 28; // Height of each layer row in pixels

// ─── Helper: Check if a node can accept children ─────────────────────────────

function isValidParent(nodeType: { type: string; isGroup?: boolean } | null): boolean {
  if (!nodeType) return false;
  // Valid parents: frame or group
  if (nodeType.type === "frame" || nodeType.isGroup === true) {
    return true;
  }
  // Invalid parents: text, image, button, divider, etc.
  return false;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useLayersDragReorder(
  opts: UseLayersDragReorderOptions
): UseLayersDragReorderReturn {
  const { onReparent, selectedNodeIds, getNodeType, getRootChildCount } = opts;

  // Drag state
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<DropTarget | null>(null);
  const isValidDrop = dropTarget?.isValidDrop ?? false;

  // Refs for the hold-to-drag activation
  const holdTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const pendingRef = React.useRef<{
    nodeId: string;
    parentId: string | undefined;
  } | null>(null);
  const isDraggingRef = React.useRef(false);
  const sourceParentRef = React.useRef<string | undefined>(undefined);

  // ── Cleanup helper ──

  const cleanup = React.useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    startPosRef.current = null;
    pendingRef.current = null;
    isDraggingRef.current = false;
    sourceParentRef.current = undefined;
    setDraggedId(null);
    setDropTarget(null);
  }, []);

  // ── Pointer Down ──

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent, nodeId: string, parentId: string | undefined) => {
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
        sourceParentRef.current = dragParentId;
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
      if (!isDraggingRef.current) return;

      // Find the element under the pointer
      const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (!elementUnder) {
        setDropTarget(null);
        return;
      }

      // Check if we're over the layers panel but not over a specific row
      const layersPanel = (elementUnder as HTMLElement).closest?.('[data-layers-panel]');
      const rowEl = (elementUnder as HTMLElement).closest?.(
        "[data-layer-node-id]"
      ) as HTMLElement | null;

      // Root-level drop: over panel but not over a row
      if (layersPanel && !rowEl) {
        const panelRect = (layersPanel as HTMLElement).getBoundingClientRect();
        const relativeY = e.clientY - panelRect.top;
        // Calculate which root index based on Y position
        const rootCount = getRootChildCount?.() ?? 0;
        const index = Math.min(Math.max(0, Math.floor(relativeY / ROW_HEIGHT)), rootCount);
        setDropTarget({
          parentId: undefined,
          index,
          isValidDrop: true,
        });
        return;
      }

      if (!rowEl) {
        setDropTarget(null);
        return;
      }

      const targetNodeId = rowEl.getAttribute("data-layer-node-id");
      const targetParentId = rowEl.getAttribute("data-layer-parent-id");
      const targetIndexStr = rowEl.getAttribute("data-layer-index");

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

      // Determine drop zone based on pointer Y position within the row
      const rect = rowEl.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const rowHeight = rect.height;

      // Calculate zone percentages
      // Top 9px (0-32% for standard 28px row): Drop BEFORE this node
      // Middle 10px (33-68%): Drop AS CHILD OF this node
      // Bottom 9px (69-100%): Drop AFTER this node
      const topZoneEnd = rowHeight * 0.32;
      const middleZoneEnd = rowHeight * 0.68;

      let dropParentId: string | undefined;
      let dropIndex: number;
      let validDrop: boolean;

      if (relativeY < topZoneEnd) {
        // Top zone: Insert before this node (same parent)
        dropParentId = targetParentId ?? undefined;
        dropIndex = targetIndex;
        validDrop = true; // Reordering within same parent or moving between parents at index is always valid
      } else if (relativeY < middleZoneEnd) {
        // Middle zone: Drop as child of this node
        if (!targetNodeId) {
          setDropTarget(null);
          return;
        }
        const nodeType = getNodeType?.(targetNodeId) ?? null;
        dropParentId = targetNodeId;
        dropIndex = 0; // Prepend as first child
        validDrop = isValidParent(nodeType);
      } else {
        // Bottom zone: Insert after this node (same parent)
        dropParentId = targetParentId ?? undefined;
        dropIndex = targetIndex + 1;
        validDrop = true; // Reordering within same parent or moving between parents at index is always valid
      }

      setDropTarget({
        parentId: dropParentId,
        index: dropIndex,
        isValidDrop: validDrop,
      });
    },
    [draggedId, getNodeType, getRootChildCount]
  );

  // ── Pointer Up ──

  const handlePointerUp = React.useCallback(
    (_e: React.PointerEvent) => {
      if (isDraggingRef.current && draggedId && dropTarget && dropTarget.isValidDrop) {
        onReparent(draggedId, sourceParentRef.current, dropTarget.parentId, dropTarget.index);
      }
      cleanup();
    },
    [draggedId, dropTarget, onReparent, cleanup]
  );

  // ── Pointer Cancel ──

  const handlePointerCancel = React.useCallback(() => {
    cleanup();
  }, [cleanup]);

  // ── Key Down (Escape to cancel) ──

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && isDraggingRef.current) {
        e.preventDefault();
        cleanup();
      }
    },
    [cleanup]
  );

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
    isValidDrop,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleKeyDown,
  };
}
