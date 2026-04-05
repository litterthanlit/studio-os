"use client";

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
};

export function InspectorSegmented({
  value,
  options,
  onChange,
}: InspectorSegmentedProps) {
  return (
    <div className="bg-[#F5F5F0] dark:bg-[#222222] rounded-[2px] p-[2px] h-[22px]">
      <div className="flex rounded-[2px] overflow-hidden gap-[1px] h-full">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "flex-1 h-[18px] px-[6px] text-[10px] font-mono text-center transition-colors rounded-[2px] flex items-center justify-center",
              value === opt.value
                ? "bg-white text-[#1A1A1A] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#333333] dark:text-[#FFFFFF]"
                : "text-[#A0A0A0] hover:text-[#6B6B6B] dark:text-[#666666] dark:hover:text-[#D0D0D0]"
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon ? <opt.icon size={12} /> : opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
