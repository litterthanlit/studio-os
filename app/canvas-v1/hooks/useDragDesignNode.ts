"use client";

/**
 * useDragDesignNode — drag-to-reposition for absolute-positioned DesignNode elements.
 *
 * Activates on pointerdown on a selected absolute-positioned node.
 * Tracks pointer movement (zoom-aware), updates style.x/y via UPDATE_NODE_STYLE,
 * pushes history on pointerup, supports shift-axis lock.
 *
 * Only activates for nodes where style.position === "absolute".
 * Gracefully does nothing when no CanvasProvider is present (e.g. test-v6 page).
 */

import { useCallback, useRef, useEffect, useContext, useState } from "react";
import { CanvasContext } from "@/lib/canvas/canvas-context";
import { findDesignNodeById, type DesignNode } from "@/lib/canvas/design-node";

type UseDragDesignNodeOptions = {
  /** The root DesignNode tree (to look up node styles) */
  tree: DesignNode;
  /** Currently selected node ID */
  selectedNodeId: string | null;
  /** Artboard ID for dispatch actions */
  artboardId: string | null;
  /** Current canvas zoom level */
  zoom: number;
  /** Whether the component is in interactive mode */
  interactive: boolean;
  /** Container element ref to scope DOM queries */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Optional snap function — called during drag to snap position to guides */
  snapPosition?: (
    x: number,
    y: number,
    width: number,
    height: number,
    nodeId?: string | null
  ) => { x: number; y: number };
};

type DragState = {
  nodeId: string;
  startScreenX: number;
  startScreenY: number;
  startNodeX: number;
  startNodeY: number;
  nodeWidth: number;
  nodeHeight: number;
  hasStarted: boolean;
  historyPushed: boolean;
};

const DRAG_THRESHOLD_PX = 4;

export function useDragDesignNode(options: UseDragDesignNodeOptions) {
  const { tree, selectedNodeId, artboardId, zoom, interactive, containerRef, snapPosition } = options;

  // Use context directly — returns null when no CanvasProvider (e.g. test-v6 page).
  // This avoids the throw from useCanvas() so the hook is safe in all contexts.
  const canvasCtx = useContext(CanvasContext);
  const dispatch = canvasCtx?.dispatch ?? null;

  const draggingRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const treeRef = useRef(tree);
  treeRef.current = tree;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const artboardIdRef = useRef(artboardId);
  artboardIdRef.current = artboardId;

  // Keep refs so closures always see the latest values
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const snapPositionRef = useRef(snapPosition);
  snapPositionRef.current = snapPosition;

  const cleanupActiveDrag = useCallback(() => {
    const drag = draggingRef.current;
    const snap = snapPositionRef.current;
    if (drag && snap) {
      snap(drag.startNodeX, drag.startNodeY, drag.nodeWidth, drag.nodeHeight, null);
    }
    cleanupListenersRef.current?.();
    cleanupListenersRef.current = null;
    draggingRef.current = null;
    setIsDragging(false);
  }, []);

  /**
   * Start a drag on a specific node. Called from pointerdown handler.
   */
  const startDrag = useCallback(
    (e: PointerEvent, nodeId: string, startX: number, startY: number, nodeWidth: number, nodeHeight: number) => {
      const d = dispatchRef.current;
      // No dispatch available (no CanvasProvider) — skip
      if (!d) return;
      // Only primary button
      if (e.button !== 0) return;
      // Skip inputs/textareas
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      // Skip if contentEditable is active
      if ((e.target as HTMLElement).closest("[data-v6-text-editing='true']")) return;

      e.stopPropagation();
      e.preventDefault();

      draggingRef.current = {
        nodeId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startNodeX: startX,
        startNodeY: startY,
        nodeWidth,
        nodeHeight,
        hasStarted: false,
        historyPushed: false,
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const drag = draggingRef.current;
        if (!drag) return;
        const dd = dispatchRef.current;
        if (!dd) return;

        const currentZoom = zoomRef.current;
        const dx = (moveEvent.clientX - drag.startScreenX) / currentZoom;
        const dy = (moveEvent.clientY - drag.startScreenY) / currentZoom;

        if (!drag.hasStarted) {
          const screenDx = moveEvent.clientX - drag.startScreenX;
          const screenDy = moveEvent.clientY - drag.startScreenY;
          if (Math.hypot(screenDx, screenDy) < DRAG_THRESHOLD_PX) {
            return;
          }
          drag.hasStarted = true;
          setIsDragging(true);
        }

        let newX = drag.startNodeX + dx;
        let newY = drag.startNodeY + dy;

        // Shift-axis lock
        if (moveEvent.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) {
            newY = drag.startNodeY;
          } else {
            newX = drag.startNodeX;
          }
        }

        // Apply snap guides (before rounding)
        const snap = snapPositionRef.current;
        if (snap) {
          const snapped = snap(newX, newY, drag.nodeWidth, drag.nodeHeight, drag.nodeId);
          newX = snapped.x;
          newY = snapped.y;
        }

        // Round to nearest pixel for clean positioning
        newX = Math.round(newX);
        newY = Math.round(newY);

        const abId = artboardIdRef.current;
        if (!abId) return;

        if (!drag.historyPushed) {
          dd({
            type: "PUSH_HISTORY",
            description: "Moved element",
          });
          drag.historyPushed = true;
        }

        dd({
          type: "UPDATE_NODE_STYLE",
          artboardId: abId,
          nodeId: drag.nodeId,
          style: { x: newX, y: newY } as Record<string, unknown>,
        });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        const drag = draggingRef.current;
        if (!drag) return;
        const dd = dispatchRef.current;

        if (!drag.hasStarted) {
          cleanupActiveDrag();
          return;
        }

        const currentZoom = zoomRef.current;
        const dx = (upEvent.clientX - drag.startScreenX) / currentZoom;
        const dy = (upEvent.clientY - drag.startScreenY) / currentZoom;

        let finalX = drag.startNodeX + dx;
        let finalY = drag.startNodeY + dy;

        if (upEvent.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) {
            finalY = drag.startNodeY;
          } else {
            finalX = drag.startNodeX;
          }
        }

        // Apply snap guides (before rounding)
        const snap = snapPositionRef.current;
        if (snap) {
          const snapped = snap(finalX, finalY, drag.nodeWidth, drag.nodeHeight, drag.nodeId);
          finalX = snapped.x;
          finalY = snapped.y;
        }

        finalX = Math.round(finalX);
        finalY = Math.round(finalY);

        const abId = artboardIdRef.current;
        if (abId && dd) {
          // Final position update
          dd({
            type: "UPDATE_NODE_STYLE",
            artboardId: abId,
            nodeId: drag.nodeId,
            style: { x: finalX, y: finalY } as Record<string, unknown>,
          });
        }

        cleanupActiveDrag();
      };

      const handlePointerCancel = () => {
        cleanupActiveDrag();
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerCancel);
      cleanupListenersRef.current = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
      };
    },
    [cleanupActiveDrag]
  );

  /**
   * Attach pointerdown listener to the selected node's DOM element
   * when it has position: absolute.
   */
  useEffect(() => {
    if (!interactive || !selectedNodeId || !artboardId || !dispatch || !containerRef.current) return;

    // Find the DOM element
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-node-id="${selectedNodeId}"]`
    );
    if (!el) return;

    const handlePointerDown = (e: PointerEvent) => {
      const latestTree = treeRef.current;
      const node = findDesignNodeById(latestTree, selectedNodeId);
      if (!node || node.style.position !== "absolute") return;

      const rect = el.getBoundingClientRect();
      const currentZoom = zoomRef.current || 1;
      const nodeWidth =
        typeof node.style.width === "number" ? node.style.width : rect.width / currentZoom;
      const nodeHeight =
        typeof node.style.height === "number" ? node.style.height : rect.height / currentZoom;

      startDrag(e, node.id, node.style.x ?? 0, node.style.y ?? 0, nodeWidth, nodeHeight);
    };

    el.addEventListener("pointerdown", handlePointerDown);
    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [interactive, selectedNodeId, artboardId, dispatch, containerRef, startDrag]);

  useEffect(() => cleanupActiveDrag, [cleanupActiveDrag]);

  return {
    /** Whether a drag is currently in progress (reactive state) */
    isDragging,
    /** The ID of the node currently being dragged */
    draggedNodeId: isDragging ? selectedNodeId : null,
  };
}
