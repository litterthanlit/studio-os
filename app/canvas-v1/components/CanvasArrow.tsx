"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import type { ArrowItem } from "@/lib/canvas/unified-canvas-state";

type CanvasArrowProps = {
  item: ArrowItem;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent, itemId: string, x: number, y: number) => void;
};

export function CanvasArrow({ item, isDragging, onPointerDown }: CanvasArrowProps) {
  const { state, dispatch } = useCanvas();
  const isSelected = state.selection.selectedItemIds.includes(item.id);

  return (
    <svg
      data-canvas-item-id={item.id}
      className={cn(
        "absolute cursor-pointer",
        isSelected && "outline outline-1 outline-[#1E5DF2]",
        isDragging && "drop-shadow-md"
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
      }}
      viewBox={`0 0 ${item.width} ${item.height}`}
      onPointerDown={(e) => onPointerDown?.(e, item.id, item.x, item.y)}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({
          type: "SELECT_ITEM",
          itemId: item.id,
          addToSelection: e.shiftKey,
        });
      }}
    >
      <line
        x1={0}
        y1={item.height / 2}
        x2={item.width}
        y2={item.height / 2}
        stroke={item.color || "#A0A0A0"}
        strokeWidth={2}
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker
          id="arrowhead"
          markerWidth={8}
          markerHeight={6}
          refX={8}
          refY={3}
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill={item.color || "#A0A0A0"}
          />
        </marker>
      </defs>
    </svg>
  );
}
