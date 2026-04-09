"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import type { ReferenceItem } from "@/lib/canvas/unified-canvas-state";
import type { HandlePosition } from "../hooks/useResize";
import { ResizeHandles } from "./ResizeHandles";

type CanvasReferenceProps = {
  item: ReferenceItem;
  isDragging?: boolean;
  isResizing?: boolean;
  isAnalyzing?: boolean;
  onPointerDown?: (e: React.PointerEvent, itemId: string, x: number, y: number) => void;
  onResizeHandlePointerDown?: (
    e: React.PointerEvent,
    itemId: string,
    handle: HandlePosition,
    itemX: number,
    itemY: number,
    itemW: number,
    itemH: number
  ) => void;
};

export function CanvasReference({
  item,
  isDragging,
  isResizing,
  isAnalyzing,
  onPointerDown,
  onResizeHandlePointerDown,
}: CanvasReferenceProps) {
  const { state, dispatch } = useCanvas();
  const isSelected = state.selection.selectedItemIds.includes(item.id);
  const extractedColors = item.extracted?.colors ?? [];

  const currentWeight = item.weight || "default";
  const nextWeight =
    currentWeight === "default" ? "primary"
    : currentWeight === "primary" ? "muted"
    : "default";

  const handleWeightToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: "UPDATE_ITEM",
      itemId: item.id,
      changes: { weight: nextWeight === "default" ? undefined : nextWeight },
    });
  };

  return (
    <div
      data-canvas-item-id={item.id}
      className="absolute"
      style={{
        left: item.x,
        top: item.y,
        zIndex: item.zIndex,
      }}
    >
      {/* Reference card */}
      <div
        className={cn(
          "canvas-reference group relative cursor-pointer rounded-[4px] border overflow-hidden bg-white transition-[border-color,box-shadow,shadow,opacity] duration-150",
          isSelected
            ? "outline outline-1 outline-[#4B57DB] border-[#4B57DB]"
            : "border-[#E5E5E0] hover:outline hover:outline-1 hover:outline-[#4B57DB]/40",
          (isDragging || isResizing) ? "shadow-md" : "shadow-sm"
        )}
        style={{
          width: item.width,
          height: item.height,
          opacity: currentWeight === "muted" ? 0.4 : 1,
          outline: currentWeight === "primary" ? "2px solid #D4A017" : undefined,
        }}
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.title || "Reference"}
          className="h-full w-full object-cover"
          draggable={false}
        />

        {/* Annotation pin */}
        {item.annotation && (
          <div className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-[#4B57DB] shadow-sm" />
        )}

        {/* Analyzing indicator — pulsing dot */}
        {isAnalyzing && (
          <div className="absolute top-2 left-2 h-2 w-2 rounded-full bg-[#4B57DB] opacity-60 animate-pulse" />
        )}

        {/* Style ref badge — moved to top-left to avoid overlap with weight toggle */}
        {item.isStyleRef && (
          <div className="absolute top-2 left-2 rounded-[2px] bg-[#4B57DB] px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-white">
            Style
          </div>
        )}

        {/* Weight toggle — top-right corner */}
        <button
          onClick={handleWeightToggle}
          className={cn(
            "absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-[2px] transition-opacity",
            currentWeight === "default" ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          )}
          style={{
            background:
              currentWeight === "primary" ? "#D4A017"
              : currentWeight === "muted" ? "rgba(0,0,0,0.4)"
              : "rgba(0,0,0,0.3)",
          }}
          title={
            currentWeight === "primary" ? "Primary reference (click to mute)"
            : currentWeight === "muted" ? "Muted (click to reset)"
            : "Click to star as primary"
          }
        >
          {currentWeight === "primary" && <Star size={12} fill="#FFF" stroke="none" />}
          {currentWeight === "muted" && <span style={{ color: "#FFF", fontSize: 10 }}>×</span>}
        </button>
      </div>

      {/* Resize handles — visible only when selected */}
      {isSelected && onResizeHandlePointerDown && (
        <ResizeHandles
          width={item.width}
          height={item.height}
          onHandlePointerDown={(e, handle) =>
            onResizeHandlePointerDown(e, item.id, handle, item.x, item.y, item.width, item.height)
          }
        />
      )}

      {/* Extracted color dots — below the card, outside the border */}
      {extractedColors.length > 0 && (
        <div className="mt-1.5 flex gap-1 opacity-60">
          {extractedColors.slice(0, 5).map((color, i) => (
            <div
              key={`${color}-${i}`}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
