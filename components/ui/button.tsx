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
        "bg-button-primary-bg text-button-primary-text border-button-primary-bg hover:opacity-90",
      secondary:
        "bg-transparent text-text-primary border-border-primary hover:border-border-hover",
      ghost:
        "bg-transparent text-text-tertiary border-transparent hover:text-text-primary",
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
