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
    <div className="rounded-[3px] bg-[#F5F5F0] p-[1px]">
      <div className="flex rounded-[2px] overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "flex-1 px-2 py-1.5 text-[11px] text-center transition-colors",
              value === opt.value
                ? "bg-[#1E5DF2] text-white"
                : "text-[#6B6B6B] hover:bg-[#E5E5E0] hover:text-[#1A1A1A]"
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
