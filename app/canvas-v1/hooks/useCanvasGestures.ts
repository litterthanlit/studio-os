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
 * - Wheel: zoom in/out centered on cursor position
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
      e.preventDefault();

      // Pinch gesture (ctrlKey set by trackpad pinch)
      if (e.ctrlKey) {
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * (1 + delta * 10)));
        const rect = container.getBoundingClientRect();
        onZoom(newZoom, {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        return;
      }

      // Regular scroll wheel zoom
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * (1 + delta * 5)));
      const rect = container.getBoundingClientRect();
      onZoom(newZoom, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [currentZoom, onZoom]);

  // ── Pointer pan (Space+drag or middle mouse) ────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const isMiddle = e.button === 1;
      const isSpacePan = e.button === 0 && spaceHeldRef.current;

      if (!isMiddle && !isSpacePan) return;

      e.preventDefault();
      e.stopPropagation();
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };

      if (containerRef.current) {
        containerRef.current.style.cursor = "grabbing";
      }

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!panStartRef.current) return;
        const dx = moveEvent.clientX - panStartRef.current.x;
        const dy = moveEvent.clientY - panStartRef.current.y;
        panStartRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
        onPan({ dx, dy });
      };

      const handlePointerUp = () => {
        isPanningRef.current = false;
        panStartRef.current = null;

        if (containerRef.current) {
          containerRef.current.style.cursor = spaceHeldRef.current ? "grab" : "default";
        }

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [onPan]
  );

  return {
    containerRef,
    handlePointerDown,
    cursorRef,
  };
}
