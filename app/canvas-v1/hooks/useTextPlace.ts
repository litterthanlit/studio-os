"use client";

import * as React from "react";
import { getCanvasDrawToolBlockReason } from "./useFrameDraw";

export type TextPlaceCommitPayload = {
  x: number;
  y: number;
  width: number;
  height: number;
  startClientX: number;
  startClientY: number;
  mode: "click" | "drag";
};

type UseTextPlaceOpts = {
  containerRef: React.RefObject<HTMLElement | null>;
  zoom: number;
  interactive: boolean;
  canvasTool: string;
  spaceHeldRef: React.RefObject<boolean>;
  onCommit: (payload: TextPlaceCommitPayload) => void;
};

const DRAG_THRESHOLD = 4;
const DEFAULT_CLICK_WIDTH = 240;
const DEFAULT_CLICK_HEIGHT = 28;
const MIN_DRAG_WIDTH = 8;
const MIN_DRAG_HEIGHT = 20;

export function useTextPlace({
  containerRef,
  zoom,
  interactive,
  canvasTool,
  spaceHeldRef,
  onCommit,
}: UseTextPlaceOpts) {
  const [drawRect, setDrawRect] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const dragRef = React.useRef({
    active: false,
    startClientX: 0,
    startClientY: 0,
    currentClientX: 0,
    currentClientY: 0,
    thresholdCrossed: false,
    pointerId: 0,
  });

  const computeRect = React.useCallback(() => {
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
    return {
      x,
      y,
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    };
  }, [containerRef, zoom]);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (canvasTool !== "text" || !interactive) return;
      if (e.button !== 0) return;
      if (spaceHeldRef.current) return;
      const target = e.target as HTMLElement;
      const blockReason = getCanvasDrawToolBlockReason(target);
      // #region agent log
      fetch("http://127.0.0.1:7393/ingest/391248b0-24d6-418e-a9f6-e5cbe0f87918", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f3006b" },
        body: JSON.stringify({
          sessionId: "f3006b",
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          hypothesisId: "H1-text-tool-start",
          runId: "initial-pass",
          location: "useTextPlace:handlePointerDown",
          message: blockReason ? "text tool start blocked" : "text tool start accepted",
          data: {
            blockReason,
            pointerId: e.pointerId,
            clientX: e.clientX,
            clientY: e.clientY,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (blockReason) return;

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
      if (!d.active || canvasTool !== "text") return;

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
      if (!d.active || canvasTool !== "text") return;

      const startClientX = d.startClientX;
      const startClientY = d.startClientY;
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

      const container = containerRef.current;
      if (!container) return;
      const cr = container.getBoundingClientRect();

      if (!wasThreshold) {
        const x = (startClientX - cr.left) / zoom;
        const y = (startClientY - cr.top) / zoom;
        onCommit({
          x,
          y,
          width: DEFAULT_CLICK_WIDTH,
          height: DEFAULT_CLICK_HEIGHT,
          startClientX,
          startClientY,
          mode: "click",
        });
        return;
      }

      const endClientX = e.clientX;
      const endClientY = e.clientY;
      const startX = (startClientX - cr.left) / zoom;
      const startY = (startClientY - cr.top) / zoom;
      const endX = (endClientX - cr.left) / zoom;
      const endY = (endClientY - cr.top) / zoom;
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      if (width < MIN_DRAG_WIDTH || height < MIN_DRAG_HEIGHT) return;

      onCommit({
        x,
        y,
        width,
        height,
        startClientX,
        startClientY,
        mode: "drag",
      });
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
