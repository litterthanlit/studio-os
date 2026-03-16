'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full border bg-bg-input px-3 py-2 rounded-lg",
          "text-sm font-sans text-text-primary placeholder:text-text-placeholder",
          "focus:outline-none transition-[border-color,background-color,box-shadow] duration-200 ease-out",
          error
            ? "border-[#EF4444] bg-[#FEF2F2] focus:border-[#EF4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]"
            : "border-border-primary focus:border-[var(--accent-pill)] focus:shadow-[0_0_0_3px_rgba(209,228,252,0.5)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
