"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type InspectorCollapsibleProps = {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function InspectorCollapsible({
  label,
  defaultOpen = true,
  children,
}: InspectorCollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-[#E5E5E0] dark:border-[#333333] mb-0.5">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F5F5F0] dark:hover:bg-[#2A2A2A] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[10px] font-mono font-medium uppercase tracking-[1px] text-[#6B6B6B] dark:text-[#666666]">
          {label}
        </span>
        <ChevronDown
          size={12}
          className={cn(
            "text-[#8A8A8A] dark:text-[#555555] transition-transform duration-150",
            !isOpen && "-rotate-90"
          )}
        />
      </button>
      {isOpen && (
        <div className="px-4 py-2 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
