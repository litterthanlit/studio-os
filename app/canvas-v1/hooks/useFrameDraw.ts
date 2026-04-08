"use client";

import * as React from "react";

export type FrameDrawRect = { x: number; y: number; width: number; height: number };

type UseFrameDrawOpts = {
  containerRef: React.RefObject<HTMLElement | null>;
  zoom: number;
  interactive: boolean;
  canvasTool: string;
  spaceHeldRef: React.RefObject<boolean>;
  onCommit: (rect: FrameDrawRect) => void;
};

const DRAG_THRESHOLD = 4;

export function useFrameDraw({
  containerRef,
  zoom,
  interactive,
  canvasTool,
  spaceHeldRef,
  onCommit,
}: UseFrameDrawOpts) {
  const [drawRect, setDrawRect] = React.useState<FrameDrawRect | null>(null);

  const dragRef = React.useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    thresholdCrossed: boolean;
    pointerId: number;
  }>({
    active: false,
    startClientX: 0,
    startClientY: 0,
    currentClientX: 0,
    currentClientY: 0,
    thresholdCrossed: false,
    pointerId: 0,
  });

  const computeRect = React.useCallback((): FrameDrawRect => {
    const d = dragRef.current;
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0, width: 0, height: 0 };
    const cr = container.getBoundingClientRect();
    const startX = (d.startClientX - cr.left) / zoom;
    const startY = (d.startClientY - cr.top) / zoom;
    const endX = (d.currentClientX - cr.left) / zoom;
    const endY = (d.currentClientY - cr.top) / zoom;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    return { x, y, width, height };
  }, [containerRef, zoom]);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (canvasTool !== "frame" || !interactive) return;
      if (e.button !== 0) return;
      if (spaceHeldRef.current) return;

      const target = e.target as HTMLElement;
      if (
        target.closest("[data-node-id]") ||
        target.closest("[data-resize-handle]") ||
        target.closest("[data-insertion-bar]") ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("[contenteditable]")
      ) {
        return;
      }

      dragRef.current = {
        active: true,
        startClientX: e.clientX,
        startClientY: e.clientY,
        currentClientX: e.clientX,
        currentClientY: e.clientY,
        thresholdCrossed: false,
        pointerId: e.pointerId,
      };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    },
    [canvasTool, interactive, spaceHeldRef]
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || canvasTool !== "frame") return;

      d.currentClientX = e.clientX;
      d.currentClientY = e.clientY;

      if (!d.thresholdCrossed) {
        const dx = e.clientX - d.startClientX;
        const dy = e.clientY - d.startClientY;
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        d.thresholdCrossed = true;
      }

      setDrawRect(computeRect());
    },
    [canvasTool, computeRect]
  );

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || canvasTool !== "frame") return;

      const startClientX = d.startClientX;
      const startClientY = d.startClientY;
      const endClientX = e.clientX;
      const endClientY = e.clientY;
      const wasThreshold = d.thresholdCrossed;
      const pointerId = d.pointerId;

      dragRef.current = {
        active: false,
        startClientX: 0,
        startClientY: 0,
        currentClientX: 0,
        currentClientY: 0,
        thresholdCrossed: false,
        pointerId: 0,
      };
      setDrawRect(null);

      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(pointerId);
      } catch {
        /* noop */
      }

      if (!wasThreshold) return;

      const container = containerRef.current;
      if (!container) return;
      const cr = container.getBoundingClientRect();
      const startX = (startClientX - cr.left) / zoom;
      const startY = (startClientY - cr.top) / zoom;
      const endX = (endClientX - cr.left) / zoom;
      const endY = (endClientY - cr.top) / zoom;
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      if (width < 8 || height < 8) return;
      onCommit({ x, y, width, height });
    },
    [canvasTool, containerRef, zoom, onCommit]
  );

  return {
    drawRect,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
