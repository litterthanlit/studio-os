"use client";

import * as React from "react";
import type { GapRect } from "@/app/canvas-v1/lib/layout-handle-math";

export type GapHandleProps = {
  gapRect: GapRect;
  currentValue: number;
  direction: "row" | "column";
  zoom: number;
  isHovered: boolean;
  isDragging: boolean;
  dragValue?: number; // live value during drag
  onHover: (hovered: boolean) => void;
  onDragStart: (pointerEvent: React.PointerEvent) => void;
  onDragMove: (e: React.PointerEvent) => void;
  onDragEnd: (e: React.PointerEvent) => void;
};

export function GapHandle({
  gapRect,
  direction,
  isHovered,
  isDragging,
  onHover,
  onDragStart,
  onDragMove,
  onDragEnd,
}: GapHandleProps) {
  // Calculate visual size based on state
  // Idle (not hovered): 4px dot, #A0A0A0 at 30% opacity
  // Hovered: 6px circle, #4B57DB (accent)
  // Dragging: 8px circle, #4B57DB

  const size = isDragging ? 8 : isHovered ? 6 : 4;
  const opacity = isDragging ? 1 : isHovered ? 1 : 0.3;
  const color = isHovered || isDragging ? "#4B57DB" : "#A0A0A0";
  
  return (
    <>
      {/* Hit area - extended for easier targeting */}
      <div
        style={{
          position: "absolute",
          left: gapRect.x - 12,
          top: gapRect.y - 12,
          width: gapRect.width + 24,
          height: gapRect.height + 24,
          cursor: direction === "row" ? "ew-resize" : "ns-resize",
          zIndex: 20,
          pointerEvents: "auto",
        }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
      />

      {/* Visual handle */}
      <div
        style={{
          position: "absolute",
          left: gapRect.centerX - size / 2,
          top: gapRect.centerY - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          opacity,
          pointerEvents: "none",
          zIndex: 21,
          transition: isDragging ? undefined : "all 150ms ease-out",
          transform: isHovered ? "scale(1.2)" : undefined,
        }}
      />
    </>
  );
}
