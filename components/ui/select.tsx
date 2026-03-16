'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none border bg-bg-input px-3 py-2 pr-10 rounded-lg",
            "text-sm font-sans text-text-primary",
            "focus:outline-none transition-[border-color,background-color,box-shadow] duration-200 ease-out",
            error
              ? "border-[#EF4444] bg-[#FEF2F2] focus:border-[#EF4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]"
              : "border-border-primary focus:border-[var(--accent-pill)] focus:shadow-[0_0_0_3px_rgba(209,228,252,0.5)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg className="h-4 w-4 text-text-placeholder" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";
