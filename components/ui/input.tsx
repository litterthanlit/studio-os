'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full border border-border-secondary bg-bg-input px-3 py-1.5",
          "text-sm text-text-primary placeholder:text-text-placeholder",
          "focus:border-[var(--accent)] focus:shadow-[var(--shadow-glow)] focus:outline-none",
          "transition-all duration-200 ease-out",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
