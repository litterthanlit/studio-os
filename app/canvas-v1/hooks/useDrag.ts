"use client";

import { useCallback, useRef } from "react";

type DragCallbacks = {
  onDragStart: (itemId: string, startPos: { x: number; y: number }) => void;
  onDragMove: (itemId: string, newPos: { x: number; y: number }) => void;
  onDragEnd: (itemId: string, finalPos: { x: number; y: number }) => void;
  zoom: number;
};

type DragHandlers = {
  onPointerDown: (e: React.PointerEvent, itemId: string, itemX: number, itemY: number) => void;
};

/**
 * Hook for dragging canvas items. Handles pointer down → move → up cycle,
 * converts screen coordinates to canvas coordinates (accounting for zoom),
 * and supports Shift-constrained axis locking.
 *
 * Usage: attach `onPointerDown` to each draggable item element.
 * The hook manages move/up listeners on `window` during active drag.
 */
export function useDrag(options: DragCallbacks): DragHandlers {
  const { onDragStart, onDragMove, onDragEnd, zoom } = options;

  const draggingRef = useRef<{
    itemId: string;
    startScreenX: number;
    startScreenY: number;
    startItemX: number;
    startItemY: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, itemId: string, itemX: number, itemY: number) => {
      // Only handle primary button (left click)
      if (e.button !== 0) return;
      // Don't start drag if clicking inside an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      e.stopPropagation();
      e.preventDefault();

      draggingRef.current = {
        itemId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startItemX: itemX,
        startItemY: itemY,
      };

      onDragStart(itemId, { x: itemX, y: itemY });

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const drag = draggingRef.current;
        if (!drag) return;

        const dx = (moveEvent.clientX - drag.startScreenX) / zoom;
        const dy = (moveEvent.clientY - drag.startScreenY) / zoom;

        let newX = drag.startItemX + dx;
        let newY = drag.startItemY + dy;

        // Shift constrains to horizontal or vertical axis
        if (moveEvent.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) {
            newY = drag.startItemY;
          } else {
            newX = drag.startItemX;
          }
        }

        onDragMove(drag.itemId, { x: newX, y: newY });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        const drag = draggingRef.current;
        if (!drag) return;

        const dx = (upEvent.clientX - drag.startScreenX) / zoom;
        const dy = (upEvent.clientY - drag.startScreenY) / zoom;

        let finalX = drag.startItemX + dx;
        let finalY = drag.startItemY + dy;

        if (upEvent.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) {
            finalY = drag.startItemY;
          } else {
            finalX = drag.startItemX;
          }
        }

        onDragEnd(drag.itemId, { x: finalX, y: finalY });

        draggingRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [onDragStart, onDragMove, onDragEnd, zoom]
  );

  return { onPointerDown: handlePointerDown };
}
