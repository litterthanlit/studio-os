"use client";

import { useCallback, useEffect, useRef } from "react";

type GestureCallbacks = {
  onPan: (delta: { dx: number; dy: number }) => void;
  onZoom: (zoom: number, center: { x: number; y: number }) => void;
  onDiscreteZoom?: () => void;
  currentZoom: number;
  activeTool?: string;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_SENSITIVITY = 0.002;

const ZOOM_STEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];

function getStepZoom(currentZoom: number, direction: "in" | "out"): number {
  // Find the closest step index
  let closestIdx = 0;
  let closestDist = Infinity;
  for (let i = 0; i < ZOOM_STEPS.length; i++) {
    const dist = Math.abs(ZOOM_STEPS[i] - currentZoom);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }
  if (direction === "in") {
    const nextIdx = Math.min(closestIdx + 1, ZOOM_STEPS.length - 1);
    return ZOOM_STEPS[nextIdx];
  } else {
    const nextIdx = Math.max(closestIdx - 1, 0);
    return ZOOM_STEPS[nextIdx];
  }
}

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
  const { onPan, onZoom, onDiscreteZoom, currentZoom, activeTool } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const spaceHeldRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRef = useRef<string>("default");

  // Keep a ref to onPan so drag-move handlers always call the latest callback
  // without needing to re-create startPan (which would re-register listeners
  // and break an in-progress drag due to stale closures).
  const onPanRef = useRef(onPan);
  onPanRef.current = onPan;

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
        onPanRef.current({ dx, dy });
      };

      const cleanup = () => {
        isPanningRef.current = false;
        panStartRef.current = null;

        if (containerRef.current) {
          const tool = activeToolRef.current;
          const isGrab = spaceHeldRef.current || tool === "hand";
          containerRef.current.style.cursor = isGrab ? "grab" : (tool === "frame" || tool === "text") ? "crosshair" : "default";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable: reads onPan via ref, not closure
    []
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
          const tool = activeToolRef.current;
          containerRef.current.style.cursor = tool === "hand" ? "grab" : (tool === "frame" || tool === "text") ? "crosshair" : "default";
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

  // ── Hand tool cursor ────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;
    if (activeTool === "hand") {
      containerRef.current.style.cursor = "grab";
    } else if (activeTool === "frame" || activeTool === "text") {
      containerRef.current.style.cursor = "crosshair";
    } else if (!spaceHeldRef.current && !isPanningRef.current) {
      containerRef.current.style.cursor = "default";
    }
  }, [activeTool]);

  // ── Wheel zoom ──────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const isPinch = e.ctrlKey && !e.metaKey;
      const isCmdWheel = e.metaKey;

      // Pinch gesture (trackpad two-finger pinch → ctrlKey=true on macOS)
      // Keep continuous — no stepping
      if (isPinch) {
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

      // Cmd + wheel → discrete step zoom
      if (isCmdWheel) {
        e.preventDefault();
        const direction = e.deltaY > 0 ? "out" : "in";
        const newZoom = getStepZoom(currentZoom, direction);
        const rect = container.getBoundingClientRect();
        onDiscreteZoom?.();
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
  }, [currentZoom, onPan, onZoom, onDiscreteZoom]);

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

  // Keep activeTool in a ref so handlePointerDown doesn't re-create on every tool change
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const isSpacePan = e.button === 0 && spaceHeldRef.current;
      const isHandToolPan = e.button === 0 && activeToolRef.current === "hand";
      if (!isSpacePan && !isHandToolPan) return;
      startPan(e, "pointer");
    },
    [startPan]
  );

  return {
    containerRef,
    handlePointerDown,
    cursorRef,
    spaceHeldRef,
    isPanningRef,
  };
}
