"use client";

import { useCallback, useRef } from "react";

export type HandlePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

type ResizeCallbacks = {
  onResizeStart: (itemId: string) => void;
  onResize: (
    itemId: string,
    newBounds: { x: number; y: number; width: number; height: number }
  ) => void;
  onResizeEnd: (
    itemId: string,
    finalBounds: { x: number; y: number; width: number; height: number }
  ) => void;
  zoom: number;
};

type ResizeHandlers = {
  onHandlePointerDown: (
    e: React.PointerEvent,
    itemId: string,
    handle: HandlePosition,
    itemX: number,
    itemY: number,
    itemW: number,
    itemH: number
  ) => void;
};

const MIN_SIZE = 40;

/**
 * Hook for resizing canvas items via drag handles.
 *
 * - Corner handles: resize both dimensions, aspect-ratio locked by default.
 *   Hold Shift for freeform.
 * - Edge handles: resize single dimension only.
 * - Converts screen deltas to canvas deltas (accounting for zoom).
 * - Adjusts x/y when dragging from top or left edges.
 */
export function useResize(options: ResizeCallbacks): ResizeHandlers {
  const { onResizeStart, onResize, onResizeEnd, zoom } = options;

  const resizingRef = useRef<{
    itemId: string;
    handle: HandlePosition;
    startScreenX: number;
    startScreenY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    aspectRatio: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      itemId: string,
      handle: HandlePosition,
      itemX: number,
      itemY: number,
      itemW: number,
      itemH: number
    ) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      resizingRef.current = {
        itemId,
        handle,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startX: itemX,
        startY: itemY,
        startW: itemW,
        startH: itemH,
        aspectRatio: itemW / (itemH || 1),
      };

      onResizeStart(itemId);

      const computeBounds = (
        screenX: number,
        screenY: number,
        shiftKey: boolean
      ) => {
        const r = resizingRef.current!;
        const dx = (screenX - r.startScreenX) / zoom;
        const dy = (screenY - r.startScreenY) / zoom;

        let newX = r.startX;
        let newY = r.startY;
        let newW = r.startW;
        let newH = r.startH;

        const isCorner = ["top-left", "top-right", "bottom-left", "bottom-right"].includes(r.handle);
        const affectsLeft = r.handle.includes("left");
        const affectsRight = r.handle.includes("right") || r.handle === "right";
        const affectsTop = r.handle.includes("top");
        const affectsBottom = r.handle.includes("bottom") || r.handle === "bottom";

        if (affectsRight && !affectsLeft) newW = r.startW + dx;
        if (affectsLeft) { newW = r.startW - dx; newX = r.startX + dx; }
        if (affectsBottom && !affectsTop) newH = r.startH + dy;
        if (affectsTop) { newH = r.startH - dy; newY = r.startY + dy; }

        // Corner: maintain aspect ratio by default, Shift = freeform
        if (isCorner && !shiftKey) {
          const targetRatio = r.aspectRatio;
          const currentRatio = newW / (newH || 1);
          if (currentRatio > targetRatio) {
            // Width is too wide — adjust width to match height
            const adjustedW = newH * targetRatio;
            if (affectsLeft) newX += newW - adjustedW;
            newW = adjustedW;
          } else {
            // Height is too tall — adjust height to match width
            const adjustedH = newW / targetRatio;
            if (affectsTop) newY += newH - adjustedH;
            newH = adjustedH;
          }
        }

        // Clamp to minimum size
        if (newW < MIN_SIZE) {
          if (affectsLeft) newX -= MIN_SIZE - newW;
          newW = MIN_SIZE;
        }
        if (newH < MIN_SIZE) {
          if (affectsTop) newY -= MIN_SIZE - newH;
          newH = MIN_SIZE;
        }

        return { x: newX, y: newY, width: newW, height: newH };
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!resizingRef.current) return;
        const bounds = computeBounds(
          moveEvent.clientX,
          moveEvent.clientY,
          moveEvent.shiftKey
        );
        onResize(resizingRef.current.itemId, bounds);
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        if (!resizingRef.current) return;
        const bounds = computeBounds(
          upEvent.clientX,
          upEvent.clientY,
          upEvent.shiftKey
        );
        onResizeEnd(resizingRef.current.itemId, bounds);
        resizingRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [onResizeStart, onResize, onResizeEnd, zoom]
  );

  return { onHandlePointerDown: handlePointerDown };
}
