"use client";

/**
 * Paper-style collapsible drawers: rounded card, soft border + shadow, header strip, +/− on the right.
 */

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function InspectorDrawerSection({
  title,
  defaultOpen = true,
  children,
  className,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <details
      className={cn(
        "overflow-hidden rounded-[10px]",
        "border border-[#E8E8E3] bg-[#FCFCFA] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        "dark:border-[#3A3A3A] dark:bg-[#1C1C1C] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
        "transition-[box-shadow] duration-150",
        open && "shadow-[0_2px_6px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.45)]",
        className
      )}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary
        className={cn(
          "list-none cursor-pointer flex items-center justify-between gap-2 select-none [&::-webkit-details-marker]:hidden",
          "px-4 py-3 min-h-[40px]",
          "bg-[#FAFAF8] dark:bg-[#242424]",
          open && "border-b border-[#EBEBE6] dark:border-[#353535]",
          "hover:bg-[#F5F5F1] dark:hover:bg-[#2A2A2A]"
        )}
      >
        <h3 className="text-[13px] font-semibold text-[#1A1A1A] dark:text-[#EEEEEE] tracking-tight">
          {title}
        </h3>
        <span className="text-[#6B6B6B] dark:text-[#999999] shrink-0" aria-hidden>
          {open ? (
            <Minus className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2} />
          )}
        </span>
      </summary>
      <div className="bg-[#F6F6F3] dark:bg-[#1E1E1E]">
        {children}
      </div>
    </details>
  );
}
