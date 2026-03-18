"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  variant?: "blue" | "warm";
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  variant = "warm",
  className,
}: EmptyStateProps) {
  const dotColor =
    variant === "blue" ? "rgba(30,93,242,0.08)" : "rgba(0,0,0,0.04)";
  const dotSize = variant === "blue" ? "1.2px" : "1px";

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[4px] border border-dashed border-[#E5E5E0] px-8 py-12",
        className
      )}
    >
      {/* Halftone dot pattern — diagonal fade from top-left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${dotColor} ${dotSize}, transparent ${dotSize})`,
          backgroundSize: "14px 14px",
          maskImage: "linear-gradient(135deg, black 0%, transparent 35%)",
          WebkitMaskImage: "linear-gradient(135deg, black 0%, transparent 35%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium text-[#1A1A1A]">{title}</p>
        {description && (
          <p className="font-mono text-[11px] text-[#6B6B6B]">{description}</p>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mono-kicker mt-1 text-[#1E5DF2] transition-opacity hover:opacity-70"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
