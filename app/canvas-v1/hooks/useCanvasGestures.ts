"use client";

import { useCallback, useEffect, useRef } from "react";

type GestureCallbacks = {
  onPan: (delta: { dx: number; dy: number }) => void;
  onZoom: (zoom: number, center: { x: number; y: number }) => void;
  currentZoom: number;
};

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 3;
const ZOOM_SENSITIVITY = 0.002;

/**
 * Hook for canvas pan/zoom gestures.
 *
 * - Wheel: scroll/pan the canvas like a page
 * - Cmd/Ctrl + wheel: zoom in/out centered on cursor position
 * - Pinch: zoom (touch devices)
 * - Space + pointer drag: pan the canvas
 * - Middle mouse drag: pan the canvas
 *
 * Returns a ref to attach to the canvas container element,
 * plus state for cursor styling.
 */
export function useCanvasGestures(options: GestureCallbacks) {
  const { onPan, onZoom, currentZoom } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const spaceHeldRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRef = useRef<string>("default");

  const startPan = useCallback(
    (
      startEvent:
        | Pick<React.PointerEvent, "clientX" | "clientY" | "preventDefault" | "stopPropagation">
        | Pick<React.MouseEvent, "clientX" | "clientY" | "preventDefault" | "stopPropagation">,
      mode: "pointer" | "mouse"
    ) => {
      startEvent.preventDefault();
      startEvent.stopPropagation();
      isPanningRef.current = true;
      panStartRef.current = { x: startEvent.clientX, y: startEvent.clientY };

      if (containerRef.current) {
        containerRef.current.style.cursor = "grabbing";
      }
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      const handlePanMove = (moveEvent: PointerEvent | MouseEvent) => {
        if (!panStartRef.current) return;
        moveEvent.preventDefault();
        const dx = moveEvent.clientX - panStartRef.current.x;
        const dy = moveEvent.clientY - panStartRef.current.y;
        panStartRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
        onPan({ dx, dy });
      };

      const cleanup = () => {
        isPanningRef.current = false;
        panStartRef.current = null;

        if (containerRef.current) {
          containerRef.current.style.cursor = spaceHeldRef.current ? "grab" : "default";
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("mousemove", handleMouseMove, true);
        window.removeEventListener("mouseup", handleMouseUp, true);
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        handlePanMove(moveEvent);
      };

      const handlePointerUp = () => {
        cleanup();
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if ((moveEvent.buttons & 4) !== 4) {
          cleanup();
          return;
        }
        handlePanMove(moveEvent);
      };

      const handleMouseUp = () => {
        cleanup();
      };

      if (mode === "mouse") {
        window.addEventListener("mousemove", handleMouseMove, true);
        window.addEventListener("mouseup", handleMouseUp, true);
        return;
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [onPan]
  );

  // ── Space key tracking ──────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        spaceHeldRef.current = true;
        if (containerRef.current) {
          containerRef.current.style.cursor = "grab";
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        if (!isPanningRef.current && containerRef.current) {
          containerRef.current.style.cursor = "default";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ── Wheel zoom ──────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const isZoomGesture = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + wheel zoom
      if (isZoomGesture) {
        e.preventDefault();
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * (1 + delta * 10)));
        const rect = container.getBoundingClientRect();
        onZoom(newZoom, {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        return;
      }

      // Regular wheel scroll pans the canvas like page scrolling.
      e.preventDefault();
      onPan({
        dx: -e.deltaX,
        dy: -e.deltaY,
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [currentZoom, onPan, onZoom]);

  // ── Native middle-mouse pan ────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMiddleMouseDown = (event: MouseEvent) => {
      if (event.button !== 1) return;
      startPan(event, "mouse");
    };

    const handleAuxClick = (event: MouseEvent) => {
      if (event.button === 1) {
        event.preventDefault();
      }
    };

    container.addEventListener("mousedown", handleMiddleMouseDown, true);
    container.addEventListener("auxclick", handleAuxClick);

    return () => {
      container.removeEventListener("mousedown", handleMiddleMouseDown, true);
      container.removeEventListener("auxclick", handleAuxClick);
    };
  }, [startPan]);

  // ── Pointer pan (Space+drag or middle mouse) ────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const isSpacePan = e.button === 0 && spaceHeldRef.current;
      if (!isSpacePan) return;
      startPan(e, "pointer");
    },
    [startPan]
  );

  return {
    containerRef,
    handlePointerDown,
    cursorRef,
  };
}
