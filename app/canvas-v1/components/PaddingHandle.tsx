"use client";

import * as React from "react";
import { MeasurementLabel } from "./MeasurementLabel";
import type { PaddingHandlePosition } from "@/app/canvas-v1/lib/layout-handle-math";

export type PaddingHandleProps = {
  position: PaddingHandlePosition;
  zoom: number;
  isHovered: boolean;
  isDragging: boolean;
  dragValue?: number;
  onHover: (hovered: boolean) => void;
  onDragStart: (pointerEvent: React.PointerEvent) => void;
  onDragMove: (e: React.PointerEvent) => void;
  onDragEnd: (e: React.PointerEvent) => void;
};

export function PaddingHandle({
  position,
  zoom,
  isHovered,
  isDragging,
  dragValue,
  onHover,
  onDragStart,
  onDragMove,
  onDragEnd,
}: PaddingHandleProps) {
  const { side, x, y, currentValue } = position;
  
  // Handle dimensions
  const isVertical = side === "left" || side === "right";
  const width = isVertical ? 6 : 20;
  const height = isVertical ? 20 : 6;
  
  // Visual state
  const handleWidth = isDragging ? (isVertical ? 8 : 24) : isHovered ? (isVertical ? 8 : 24) : (isVertical ? 6 : 20);
  const handleHeight = isDragging ? (isVertical ? 24 : 8) : isHovered ? (isVertical ? 24 : 8) : (isVertical ? 20 : 6);
  const color = isHovered || isDragging ? "#4B57DB" : "#A0A0A0";
  const opacity = isDragging ? 1 : isHovered ? 1 : 0.4;
  
  // Cursor based on side
  const cursor = isVertical ? "ew-resize" : "ns-resize";
  
  // Dashed preview line extends into frame
  const showPreview = isHovered || isDragging;
  
  return (
    <>
      {/* Hit area - extended for easier targeting */}
      <div
        style={{
          position: "absolute",
          left: x - (isVertical ? 16 : width / 2 + 8),
          top: y - (isVertical ? height / 2 + 8 : 16),
          width: isVertical ? 32 : width + 16,
          height: isVertical ? height + 16 : 32,
          cursor,
          zIndex: 25,
        }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
      />
      
      {/* Dashed preview line (extends into frame) */}
      {showPreview && (
        <div
          style={{
            position: "absolute",
            left: side === "left" ? x - currentValue / 2 : side === "right" ? x : x - (isVertical ? 0 : currentValue / 2),
            top: side === "top" ? y - currentValue / 2 : side === "bottom" ? y : y - (isVertical ? currentValue / 2 : 0),
            width: isVertical ? 1 : currentValue,
            height: isVertical ? currentValue : 1,
            borderLeft: isVertical ? "1px dashed #4B57DB" : undefined,
            borderTop: !isVertical ? "1px dashed #4B57DB" : undefined,
            opacity: 0.5,
            pointerEvents: "none",
            zIndex: 24,
          }}
        />
      )}
      
      {/* Visual handle */}
      <div
        style={{
          position: "absolute",
          left: x - handleWidth / 2,
          top: y - handleHeight / 2,
          width: handleWidth,
          height: handleHeight,
          borderRadius: 3,
          backgroundColor: color,
          opacity,
          pointerEvents: "none",
          zIndex: 26,
          transition: isDragging ? undefined : "all 150ms ease-out",
        }}
      />
    </>
  );
}
