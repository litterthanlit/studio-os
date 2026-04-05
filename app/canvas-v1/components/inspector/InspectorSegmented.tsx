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
    <div className="rounded-[3px] bg-[#F5F5F0] dark:bg-[#222222] p-[1px]">
      <div className="flex rounded-[2px] overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "flex-1 px-2 py-1 text-[10px] font-mono text-center transition-colors",
              value === opt.value
                ? "bg-[#4B57DB] text-white"
                : "text-[#6B6B6B] dark:text-[#D0D0D0] hover:bg-[#E5E5E0] dark:hover:bg-[#333333] hover:text-[#1A1A1A] dark:hover:text-[#FFFFFF]"
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
