"use client";

/**
 * Compact inspector sections: flat stacked rows with divider lines.
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
        "overflow-hidden border-b border-[var(--inspector-border)] bg-[var(--inspector-bg)]",
        className
      )}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary
        className={cn(
          "list-none cursor-pointer flex items-center justify-between gap-2 select-none [&::-webkit-details-marker]:hidden",
          "min-h-[30px] px-3 py-1.5",
          "hover:bg-[var(--inspector-surface-hover)]"
        )}
      >
        <h3 className="text-[11px] font-semibold tracking-normal text-[var(--text-primary)]">
          {title}
        </h3>
        <span className="text-[#6B6B6B] dark:text-[#999999] shrink-0" aria-hidden>
          {open ? (
            <Minus className="h-3.5 w-3.5" strokeWidth={2} />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          )}
        </span>
      </summary>
      <div className="bg-[var(--inspector-bg)]">
        {children}
      </div>
    </details>
  );
}
