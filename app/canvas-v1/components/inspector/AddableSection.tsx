"use client";

import * as React from "react";
import { Plus, Minus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AddableSectionProps = {
  title: string;
  hasValue: boolean;
  onAdd: () => void;
  onRemove: () => void;
  children: React.ReactNode;
};

export function AddableSection({
  title,
  hasValue,
  onAdd,
  onRemove,
  children,
}: AddableSectionProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  if (!hasValue) {
    return (
      <div className="border-b border-[#E5E5E0] mb-0.5">
        <div className="w-full flex items-center justify-between px-4 py-2.5">
          <span className="text-[10px] font-mono font-medium uppercase tracking-[1px] text-[#6B6B6B]">
            {title}
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="text-[#A0A0A0] hover:text-[#4B57DB] transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[#E5E5E0] mb-0.5">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F5F5F0]/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[10px] font-mono font-medium uppercase tracking-[1px] text-[#6B6B6B]">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onRemove();
              }
            }}
            className="text-[#A0A0A0] hover:text-red-500 transition-colors"
          >
            <Minus size={12} />
          </span>
          <ChevronDown
            size={12}
            className={cn(
              "text-[#8A8A8A] transition-transform duration-150",
              !isOpen && "-rotate-90"
            )}
          />
        </div>
      </button>
      {isOpen && (
        <div className="px-4 py-2 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
