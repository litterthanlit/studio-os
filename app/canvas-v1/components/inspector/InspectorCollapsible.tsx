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
    <div className="border-b border-[#E5E5E0]">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#F5F5F0]/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#A0A0A0]">
          {label}
        </span>
        <ChevronDown
          size={12}
          className={cn(
            "text-[#A0A0A0] transition-transform duration-150",
            !isOpen && "-rotate-90"
          )}
        />
      </button>
      {isOpen && (
        <div className="px-4 py-2 pb-3 space-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}
