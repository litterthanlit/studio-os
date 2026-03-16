'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /**
   * icon-button square size. Only applies when variant="icon".
   * Defaults to 32px.
   */
  iconSize?: number;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", iconSize = 32, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-1.5 font-medium " +
      "transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-out " +
      "focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(209,228,252,0.5)] focus-visible:border-[var(--accent-pill)] " +
      "active:opacity-95 " +
      "disabled:cursor-not-allowed disabled:opacity-40 select-none";

    const variants: Record<ButtonVariant, string> = {
      // #2430AD bg, white text, rounded-lg, 13px, 10px 20px padding
      primary:
        "h-9 px-[20px] text-[13px] rounded-lg " +
        "bg-[#2430AD] text-white border border-transparent " +
        "shadow-[0_1px_2px_rgba(36,48,173,0.12)] " +
        "hover:bg-[#1C27A0] hover:shadow-[0_2px_4px_rgba(36,48,173,0.15)] hover:-translate-y-[0.5px]",

      // transparent, 1px #2430AD border, #2430AD text
      secondary:
        "h-9 px-[20px] text-[13px] rounded-lg " +
        "bg-transparent text-[#2430AD] border border-[#2430AD] " +
        "hover:bg-[#F4F8FF]",

      // no border, #64748B text → #0F172A on hover
      ghost:
        "h-9 px-[20px] text-[13px] rounded-lg " +
        "bg-transparent text-[#64748B] border border-transparent " +
        "hover:bg-[#F4F8FF] hover:text-[#0F172A]",

      // #D1E4FC bg, #2430AD text — soft/accent
      accent:
        "h-9 px-[20px] text-[13px] rounded-lg " +
        "bg-[#D1E4FC] text-[#2430AD] border border-transparent " +
        "hover:bg-[#C1D8F5]",

      // destructive
      danger:
        "h-9 px-[20px] text-[13px] rounded-lg " +
        "bg-transparent text-[#EF4444] border border-[#EF4444]/30 " +
        "hover:bg-[#EF4444]/10",

      // circular icon-button
      icon:
        "rounded-full bg-transparent text-[#64748B] border border-transparent " +
        "hover:bg-[#F4F8FF] hover:text-[#0F172A]",
    };

    const iconStyle =
      variant === "icon"
        ? { width: iconSize, height: iconSize, padding: 0 }
        : undefined;

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], className)}
        style={iconStyle}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
