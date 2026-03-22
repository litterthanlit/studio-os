"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/lib/canvas/canvas-context";
import type { NoteItem } from "@/lib/canvas/unified-canvas-state";

type CanvasNoteProps = {
  item: NoteItem;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent, itemId: string, x: number, y: number) => void;
};

export function CanvasNote({ item, isDragging, onPointerDown }: CanvasNoteProps) {
  const { state, dispatch } = useCanvas();
  const isSelected = state.selection.selectedItemIds.includes(item.id);

  return (
    <div
      data-canvas-item-id={item.id}
      className={cn(
        "absolute cursor-pointer rounded-[4px] border p-3 text-[13px] leading-relaxed transition-[border-color,box-shadow,shadow] duration-150",
        isSelected
          ? "outline outline-1 outline-[#1E5DF2] border-[#1E5DF2]"
          : "border-[#E5E5E0] hover:outline hover:outline-1 hover:outline-[#1E5DF2]/40",
        isDragging ? "shadow-md" : "shadow-sm"
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
        backgroundColor: item.color || "#FEF3C7",
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
      {item.text}
    </div>
  );
}
