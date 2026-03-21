"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SectionActionRailProps = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  dragging?: boolean;
  onDragPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onAddBelow: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAI: () => void;
};

const btnCls =
  "flex h-7 w-7 items-center justify-center rounded-[3px] text-[#6B6B6B] transition-colors hover:bg-[#F5F5F0] hover:text-[#1A1A1A]";

export function SectionActionRail({
  canMoveUp,
  canMoveDown,
  dragging = false,
  onDragPointerDown,
  onAddBelow,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onAI,
}: SectionActionRailProps) {
  const stop = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="absolute left-3 top-3 z-30 flex items-center gap-0.5 rounded-[6px] border border-[#E5E5E0] bg-white/96 p-1 shadow-sm backdrop-blur-sm"
      onMouseDown={stop}
      onClick={stop}
    >
      <button
        type="button"
        aria-label="Drag to reorder section"
        title="Drag to reorder section"
        className={cn(
          btnCls,
          dragging ? "cursor-grabbing" : "cursor-grab",
          "text-[#A0A0A0]"
        )}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDragPointerDown(event);
        }}
      >
        <GripVertical size={14} />
      </button>
      <button type="button" aria-label="Add section below" title="Add section below" className={btnCls} onClick={onAddBelow}>
        <Plus size={14} />
      </button>
      <button
        type="button"
        aria-label="Move section up"
        title="Move section up"
        className={cn(btnCls, !canMoveUp && "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-[#6B6B6B]")}
        onClick={onMoveUp}
        disabled={!canMoveUp}
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        aria-label="Move section down"
        title="Move section down"
        className={cn(btnCls, !canMoveDown && "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-[#6B6B6B]")}
        onClick={onMoveDown}
        disabled={!canMoveDown}
      >
        <ChevronDown size={14} />
      </button>
      <button type="button" aria-label="Duplicate section" title="Duplicate section" className={btnCls} onClick={onDuplicate}>
        <Copy size={14} />
      </button>
      <button type="button" aria-label="Edit section with AI" title="Edit section with AI" className={btnCls} onClick={onAI}>
        <Sparkles size={14} />
      </button>
      <button
        type="button"
        aria-label="Delete section"
        title="Delete section"
        className={cn(btnCls, "text-[#A55D5D] hover:bg-[#FCF4F4] hover:text-[#8A3D3D]")}
        onClick={onDelete}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
