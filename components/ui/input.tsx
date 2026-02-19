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
          "flex h-9 w-full rounded-md border border-[#333333] bg-transparent px-3 py-1.5",
          "text-sm text-white placeholder:text-gray-500",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent",
          "transition-[background-color,border-color] duration-200 ease-out",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
