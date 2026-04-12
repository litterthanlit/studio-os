"use client";

/**
 * InspectorSegmented — Fixed/Hug/Fill segmented control.
 *
 * Framer-style: pill inside muted background, 22px height.
 * Active state: white pill with subtle shadow.
 */

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

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
    <div className={cn("bg-[#F5F5F0] dark:bg-[#2A2A2A] rounded-[2px] p-[2px] h-[22px]", className)}>
      <div className="flex rounded-[2px] overflow-hidden gap-[1px] h-full">
        {options.map((opt) => {
          const isSelected = !mixed && value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "flex-1 h-[18px] px-[6px] text-[10px] font-mono text-center transition-all duration-100 rounded-[2px] flex items-center justify-center",
                isSelected
                  ? opt.icon
                    ? "bg-white text-[#4B57DB] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#333333] dark:text-[#7B8CFF]"
                    : "bg-white text-[#1A1A1A] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#333333] dark:text-[#FFFFFF]"
                  : "text-[#A0A0A0] hover:text-[#6B6B6B] dark:text-[#666666] dark:hover:text-[#D0D0D0]"
              )}
              onClick={() => onChange(opt.value)}
            >
              {opt.icon ? <opt.icon size={12} /> : opt.label}
            </button>
          );
        })}
      </div>
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
    <div className={cn("bg-[#F5F5F0] dark:bg-[#2A2A2A] rounded-[2px] p-[1px] h-[20px]", className)}>
      <div className="flex rounded-[2px] overflow-hidden h-full">
        {options.map((opt) => {
          const isSelected = !mixed && value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "flex-1 h-[18px] px-1.5 text-[9px] font-mono text-center transition-all duration-100 rounded-[2px] flex items-center justify-center",
                isSelected
                  ? "bg-white text-[#1A1A1A] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#333333] dark:text-[#FFFFFF]"
                  : "text-[#A0A0A0] hover:text-[#6B6B6B] dark:text-[#666666] dark:hover:text-[#D0D0D0]"
              )}
              onClick={() => onChange(opt.value)}
            >
              {opt.icon ? <opt.icon size={10} /> : opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
