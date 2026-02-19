'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center px-3 py-2 text-sm font-medium " +
      "border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent " +
      "disabled:cursor-not-allowed disabled:opacity-50 rounded-md " +
      "transition-[background-color,border-color] duration-200 ease-out";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-white text-black border-white hover:border-white/90",
      secondary:
        "bg-transparent text-white border-[#333333] hover:border-white/20",
      ghost:
        "bg-transparent text-gray-300 border-transparent hover:text-white hover:border-white/10",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
