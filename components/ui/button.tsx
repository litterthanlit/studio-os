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
      primary:
        "h-9 rounded-[2px] border border-transparent bg-[#4B57DB] px-[18px] text-[13px] text-white " +
        "shadow-[0_1px_2px_rgba(75,87,219,0.18)] hover:-translate-y-[0.5px] hover:bg-[#3D49C7] hover:shadow-[0_6px_18px_rgba(75,87,219,0.16)]",
      secondary:
        "h-9 rounded-[2px] border border-[#E5E5E0] bg-white px-[18px] text-[13px] text-[#1A1A1A] " +
        "hover:border-[#D1E4FC] hover:bg-[#F5F5F0] hover:text-[#4B57DB]",
      ghost:
        "h-9 rounded-[2px] border border-transparent bg-transparent px-[18px] text-[13px] text-[#6B6B6B] " +
        "hover:bg-[#F5F5F0] hover:text-[#1A1A1A]",
      accent:
        "h-9 rounded-[2px] border border-[#C6D9F7] bg-[#D1E4FC] px-[18px] text-[13px] text-[#4B57DB] " +
        "hover:border-[#AFC9F6] hover:bg-[#C4DAFC]",
      danger:
        "h-9 rounded-[2px] border border-[#EF4444]/30 bg-transparent px-[18px] text-[13px] text-[#EF4444] " +
        "hover:bg-[#EF4444]/10",
      icon:
        "rounded-[4px] border border-transparent bg-transparent text-[#64748B] " +
        "hover:bg-[#F5F5F0] hover:text-[#1A1A1A]",
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
