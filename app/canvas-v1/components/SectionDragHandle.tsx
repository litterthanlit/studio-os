"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionDragHandleProps = {
  selected?: boolean;
  dragging?: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
};

export function SectionDragHandle({
  selected = false,
  dragging = false,
  onPointerDown,
}: SectionDragHandleProps) {
  return (
    <button
      type="button"
      data-section-drag-handle="true"
      aria-label="Reorder section"
      title="Drag to reorder section"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPointerDown(event);
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className={cn(
        "absolute left-0 top-1/2 z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E0] bg-white/92 shadow-sm opacity-0 transition-opacity duration-150",
        "group-hover:opacity-100",
        (selected || dragging) && "opacity-100",
        dragging ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      <GripVertical size={14} className="text-[#A0A0A0]" />
    </button>
  );
}
