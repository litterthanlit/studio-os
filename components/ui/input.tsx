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
          "flex h-10 w-full border border-[#222] bg-[#0a0a0a] px-3 py-1.5",
          "text-sm text-white placeholder:text-[#444]",
          "focus:border-[#444] focus:outline-none",
          "transition-[border-color] duration-200 ease-out",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
