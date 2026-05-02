"use client";

/**
 * InspectorSegmented — Fixed/Hug/Fill segmented control.
 *
 * Framer-style: ~8px outer radius, ~6px selected pill, muted track (#EBEBE8),
 * active = white + subtle shadow + accent text.
 */

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const trackCls =
  "bg-[#EBEBE8] dark:bg-[#2A2A2A] rounded-md p-0.5 gap-0.5 h-6 min-h-[24px] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-none";

const pillSelectedCls =
  "bg-white text-[#1A1A1A] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:bg-[#333333] dark:text-[#FFFFFF]";

const pillSelectedIconCls =
  "bg-white text-[#4B57DB] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:bg-[#333333] dark:text-[#7B8CFF]";

const pillIdleCls =
  "text-[#8A8A8A] hover:text-[#5C5C5C] dark:text-[#666666] dark:hover:text-[#D0D0D0]";

type SegmentOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
};

type InspectorSegmentedProps = {
  value: string;
  options: SegmentOption[];
  onChange: (value: string) => void;
  className?: string;
  mixed?: boolean;
};

export function InspectorSegmented({
  value,
  options,
  onChange,
  className,
  mixed,
}: InspectorSegmentedProps) {
  return (
    <div className={cn("flex w-full", trackCls, className)}>
      {options.map((opt) => {
        const isSelected = !mixed && value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "flex-1 min-h-0 rounded-[4px] px-1.5 text-[11px] font-medium text-center transition-all duration-100 flex items-center justify-center",
              isSelected
                ? opt.icon
                  ? pillSelectedIconCls
                  : pillSelectedCls
                : pillIdleCls
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon ? <opt.icon size={14} strokeWidth={1.75} /> : opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── InspectorSegmentedSmall — Compact variant for tight spaces ──────────────

export function InspectorSegmentedSmall({
  value,
  options,
  onChange,
  className,
  mixed,
}: InspectorSegmentedProps) {
  return (
    <div
      className={cn(
        "flex w-full bg-[#EBEBE8] dark:bg-[#2A2A2A] rounded-md p-0.5 gap-0.5 h-6 min-h-[24px]",
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = !mixed && value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "flex-1 rounded-[4px] px-1 text-[10px] font-medium text-center transition-all duration-100 flex items-center justify-center",
              isSelected ? pillSelectedCls : pillIdleCls
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon ? <opt.icon size={12} strokeWidth={1.75} /> : opt.label}
          </button>
        );
      })}
    </div>
  );
}
