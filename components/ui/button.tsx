'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "danger";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center h-10 px-4 text-sm font-medium " +
      "border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent " +
      "disabled:cursor-not-allowed disabled:opacity-50 " +
      "transition-[background-color,border-color,color] duration-200 ease-out";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-white text-black border-white hover:bg-[#eee] hover:border-[#eee]",
      secondary:
        "bg-transparent text-white border-[#333] hover:border-[#666] hover:text-white",
      ghost:
        "bg-transparent text-[#555] border-transparent hover:text-white",
      danger:
        "bg-transparent text-[#EE0000] border-[#EE0000]/30 hover:bg-[#EE0000]/10",
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
