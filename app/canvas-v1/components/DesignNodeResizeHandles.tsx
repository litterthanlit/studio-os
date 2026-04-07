"use client";

/**
 * DesignNodeResizeHandles — 8 resize handles for selected DesignNode elements.
 *
 * Follows the same visual style as ResizeHandles.tsx (small blue-bordered squares),
 * but wired to update DesignNodeStyle (width/height/x/y) instead of CanvasItem bounds.
 *
 * Supports:
 * - Corner handles: resize both dimensions
 * - Edge handles: resize single dimension
 * - Shift key: lock aspect ratio
 * - Alt/Option key: resize from center (both sides equally)
 * - Minimum size: 20x20px
 * - Zoom-aware pointer deltas
 * - Absolute-positioned nodes: updates x/y when resizing from left/top edges
 */

import * as React from "react";
import { useCallback, useRef } from "react";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";

// ── Handle Types ─────────────────────────────────────────────────────

type HandlePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

// ── Constants ────────────────────────────────────────────────────────

const HANDLE_SIZE = 8;
const HALF = HANDLE_SIZE / 2;
const MIN_SIZE = 20;

// ── Handle Definitions ───────────────────────────────────────────────

const HANDLES: Array<{
  position: HandlePosition;
  cursor: string;
  getStyle: (w: number, h: number) => React.CSSProperties;
}> = [
  {
    position: "top-left",
    cursor: "nwse-resize",
    getStyle: () => ({ top: -HALF, left: -HALF }),
  },
  {
    position: "top",
    cursor: "ns-resize",
    getStyle: (w) => ({ top: -HALF, left: w / 2 - HALF }),
  },
  {
    position: "top-right",
    cursor: "nesw-resize",
    getStyle: (w) => ({ top: -HALF, left: w - HALF }),
  },
  {
    position: "right",
    cursor: "ew-resize",
    getStyle: (w, h) => ({ top: h / 2 - HALF, left: w - HALF }),
  },
  {
    position: "bottom-right",
    cursor: "nwse-resize",
    getStyle: (w, h) => ({ top: h - HALF, left: w - HALF }),
  },
  {
    position: "bottom",
    cursor: "ns-resize",
    getStyle: (w, h) => ({ top: h - HALF, left: w / 2 - HALF }),
  },
  {
    position: "bottom-left",
    cursor: "nesw-resize",
    getStyle: (_, h) => ({ top: h - HALF, left: -HALF }),
  },
  {
    position: "left",
    cursor: "ew-resize",
    getStyle: (_, h) => ({ top: h / 2 - HALF, left: -HALF }),
  },
];

// ── Props ────────────────────────────────────────────────────────────

type DesignNodeResizeHandlesProps = {
  /** The selected DesignNode */
  node: DesignNode;
  /** Measured bounding box of the rendered node element (relative to artboard) */
  nodeRect: { width: number; height: number };
  /** Current canvas zoom level */
  zoom: number;
  /** Called on each pointer move with partial style updates */
  onResize: (styleUpdate: Partial<DesignNodeStyle>) => void;
  /** Called at the start of a resize burst to capture history before mutation */
  onResizeEnd: (styleUpdate: Partial<DesignNodeStyle>) => void;
  /** Called when a resize drag starts */
  onResizeStart?: () => void;
  /** Called when a resize drag ends (pointer up or cancel) */
  onResizeDone?: () => void;
  /** Called when resize converts a Fill axis to Fixed */
  onSizingModeChanged?: (axes: "width" | "height" | "both") => void;
};

// ── Component ────────────────────────────────────────────────────────

export function DesignNodeResizeHandles({
  node,
  nodeRect,
  zoom,
  onResize,
  onResizeEnd,
  onResizeStart,
  onResizeDone,
  onSizingModeChanged,
}: DesignNodeResizeHandlesProps) {
  const resizingRef = useRef<{
    handle: HandlePosition;
    startScreenX: number;
    startScreenY: number;
    startW: number;
    startH: number;
    startX: number;
    startY: number;
    aspectRatio: number;
    isAbsolute: boolean;
    canResizeWidth: boolean;
    canResizeHeight: boolean;
    historyCaptured: boolean;
    lastUpdateKey: string | null;
  } | null>(null);

  // Allow Fill/Hug nodes to be resized — converts to Fixed on drag.
  // Omitted width/height (undefined) is common on buttons/text — still show handles
  // so the selection box matches Framer/Figma (blue outline without handles felt broken).
  const canResizeWidth =
    node.style.position === "absolute" ||
    typeof node.style.width === "number" ||
    node.style.width === "fill" ||
    node.style.width === "hug" ||
    node.style.width === undefined;
  const canResizeHeight =
    node.style.position === "absolute" ||
    typeof node.style.height === "number" ||
    node.style.height === "fill" ||
    node.style.height === "hug" ||
    node.style.height === undefined;

  const enabledHandles = HANDLES.filter(({ position }) => {
    const affectsHorizontal =
      position.includes("left") || position.includes("right") || position === "right";
    const affectsVertical =
      position.includes("top") || position.includes("bottom") || position === "bottom";

    if (affectsHorizontal && !canResizeWidth) return false;
    if (affectsVertical && !canResizeHeight) return false;
    return true;
  });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, handle: HandlePosition) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const startW =
        typeof node.style.width === "number"
          ? node.style.width
          : nodeRect.width;
      const startH =
        typeof node.style.height === "number"
          ? node.style.height
          : nodeRect.height;

      resizingRef.current = {
        handle,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startW,
        startH,
        startX: node.style.x ?? 0,
        startY: node.style.y ?? 0,
        aspectRatio: startW / (startH || 1),
        isAbsolute: node.style.position === "absolute",
        canResizeWidth,
        canResizeHeight,
        historyCaptured: false,
        lastUpdateKey: null,
      };

      // Capture original sizing modes before any mutation
      const originalWidthMode = node.style.width;
      const originalHeightMode = node.style.height;

      onResizeStart?.();

      const computeUpdate = (
        screenX: number,
        screenY: number,
        shiftKey: boolean,
        altKey: boolean
      ): Partial<DesignNodeStyle> => {
        const r = resizingRef.current!;
        const dx = (screenX - r.startScreenX) / zoom;
        const dy = (screenY - r.startScreenY) / zoom;

        let newW = r.startW;
        let newH = r.startH;
        let newX = r.startX;
        let newY = r.startY;

        const isCorner = [
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
        ].includes(r.handle);
        const affectsLeft = r.handle.includes("left");
        const affectsRight =
          r.handle.includes("right") || r.handle === "right";
        const affectsTop = r.handle.includes("top");
        const affectsBottom =
          r.handle.includes("bottom") || r.handle === "bottom";

        // Apply deltas based on which edge is being dragged
        if (r.canResizeWidth && affectsRight && !affectsLeft) newW = r.startW + dx;
        if (r.canResizeWidth && affectsLeft) {
          newW = r.startW - dx;
          newX = r.startX + dx;
        }
        if (r.canResizeHeight && affectsBottom && !affectsTop) newH = r.startH + dy;
        if (r.canResizeHeight && affectsTop) {
          newH = r.startH - dy;
          newY = r.startY + dy;
        }

        // Alt/Option: resize from center (mirror the delta to the opposite edge)
        if (altKey) {
          if (r.canResizeWidth && affectsRight && !affectsLeft) {
            newW = r.startW + dx * 2;
            newX = r.startX - dx;
          }
          if (r.canResizeWidth && affectsLeft && !affectsRight) {
            newW = r.startW - dx * 2;
            newX = r.startX + dx;
          }
          if (r.canResizeHeight && affectsBottom && !affectsTop) {
            newH = r.startH + dy * 2;
            newY = r.startY - dy;
          }
          if (r.canResizeHeight && affectsTop && !affectsBottom) {
            newH = r.startH - dy * 2;
            newY = r.startY + dy;
          }
          // Corners with alt: both axes from center
          if (isCorner) {
            if (r.canResizeWidth && affectsRight) {
              newW = r.startW + dx * 2;
              newX = r.startX - dx;
            }
            if (r.canResizeWidth && affectsLeft) {
              newW = r.startW - dx * 2;
              newX = r.startX + dx;
            }
            if (r.canResizeHeight && affectsBottom) {
              newH = r.startH + dy * 2;
              newY = r.startY - dy;
            }
            if (r.canResizeHeight && affectsTop) {
              newH = r.startH - dy * 2;
              newY = r.startY + dy;
            }
          }
        }

        // Shift: lock aspect ratio on corner handles
        if (isCorner && shiftKey && r.canResizeWidth && r.canResizeHeight) {
          const targetRatio = r.aspectRatio;
          const currentRatio = newW / (newH || 1);
          if (currentRatio > targetRatio) {
            const adjustedW = newH * targetRatio;
            if (affectsLeft) newX += newW - adjustedW;
            if (altKey && !affectsLeft) newX -= (adjustedW - newW) / 2;
            newW = adjustedW;
          } else {
            const adjustedH = newW / targetRatio;
            if (affectsTop) newY += newH - adjustedH;
            if (altKey && !affectsTop) newY -= (adjustedH - newH) / 2;
            newH = adjustedH;
          }
        }

        // Clamp to minimum size
        if (r.canResizeWidth && newW < MIN_SIZE) {
          if (affectsLeft) newX -= MIN_SIZE - newW;
          newW = MIN_SIZE;
        }
        if (r.canResizeHeight && newH < MIN_SIZE) {
          if (affectsTop) newY -= MIN_SIZE - newH;
          newH = MIN_SIZE;
        }

        // Build the style update
        const update: Partial<DesignNodeStyle> = {};

        if (r.canResizeWidth) {
          update.width = Math.round(newW);
        }
        if (r.canResizeHeight) {
          update.height = Math.round(newH);
        }

        // Only update position for absolute-positioned nodes
        if (r.isAbsolute) {
          if (r.canResizeWidth) update.x = Math.round(newX);
          if (r.canResizeHeight) update.y = Math.round(newY);
        }

        return update;
      };

      const getUpdateKey = (update: Partial<DesignNodeStyle>) =>
        JSON.stringify([
          update.width ?? null,
          update.height ?? null,
          update.x ?? null,
          update.y ?? null,
        ]);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!resizingRef.current) return;
        const update = computeUpdate(
          moveEvent.clientX,
          moveEvent.clientY,
          moveEvent.shiftKey,
          moveEvent.altKey
        );
        const updateKey = getUpdateKey(update);
        if (updateKey === resizingRef.current.lastUpdateKey) return;
        if (!resizingRef.current.historyCaptured) {
          onResizeEnd({});
          resizingRef.current.historyCaptured = true;
        }
        resizingRef.current.lastUpdateKey = updateKey;
        onResize(update);
      };

      const cleanup = () => {
        resizingRef.current = null;
        onResizeDone?.();
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        if (!resizingRef.current) return;
        const r = resizingRef.current;
        if (r.historyCaptured) {
          const update = computeUpdate(
            upEvent.clientX,
            upEvent.clientY,
            upEvent.shiftKey,
            upEvent.altKey
          );
          const updateKey = getUpdateKey(update);
          if (updateKey !== r.lastUpdateKey) {
            onResize(update);
          }
          // Detect Fill → Fixed conversion and notify.
          // Deferred via queueMicrotask to avoid "setState during render" warning —
          // the pointerUp handler runs during a render reconciliation pass.
          if (onSizingModeChanged) {
            const widthConverted = originalWidthMode === "fill" && r.canResizeWidth;
            const heightConverted = originalHeightMode === "fill" && r.canResizeHeight;
            const axes = widthConverted && heightConverted ? "both"
              : widthConverted ? "width"
              : heightConverted ? "height"
              : null;
            if (axes) {
              queueMicrotask(() => onSizingModeChanged(axes));
            }
          }
        }
        cleanup();
      };

      const handlePointerCancel = () => {
        if (!resizingRef.current) return;
        const update = computeUpdate(
          resizingRef.current.startScreenX,
          resizingRef.current.startScreenY,
          false,
          false
        );
        if (resizingRef.current.historyCaptured) {
          onResize(update);
        }
        cleanup();
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerCancel);
    },
    [canResizeHeight, canResizeWidth, node.style, nodeRect, zoom, onResize, onResizeEnd, onResizeStart, onResizeDone, onSizingModeChanged]
  );

  const w = nodeRect.width;
  const h = nodeRect.height;

  if (enabledHandles.length === 0) {
    return null;
  }

  return (
    <>
      {enabledHandles.map(({ position, cursor, getStyle }) => (
        <div
          key={position}
          style={{
            position: "absolute",
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            borderRadius: 1,
            border: "1px solid #4B57DB",
            backgroundColor: "white",
            cursor,
            zIndex: 10,
            transition: "transform 100ms ease, background-color 100ms ease",
            ...getStyle(w, h),
          }}
          onPointerDown={(e) => handlePointerDown(e, position)}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = "#4B57DB";
            el.style.transform = "scale(1.25)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = "white";
            el.style.transform = "scale(1)";
          }}
        />
      ))}
    </>
  );
}
