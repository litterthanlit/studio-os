'use client';

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/animations";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "danger";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center h-10 px-4 text-sm font-medium " +
      "border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent " +
      "disabled:cursor-not-allowed disabled:opacity-50";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-button-primary-bg text-button-primary-text border-button-primary-bg hover:opacity-90 hover:shadow-[var(--shadow-sm)]",
      secondary:
        "bg-transparent text-text-primary border-border-primary hover:border-border-hover hover:shadow-[var(--shadow-xs)]",
      ghost:
        "bg-transparent text-text-tertiary border-transparent hover:text-text-primary",
      danger:
        "bg-transparent text-[#EE0000] border-[#EE0000]/30 hover:bg-[#EE0000]/10",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(base, variants[variant], className)}
        whileHover={{ scale: 1.02, transition: springs.smooth }}
        whileTap={{ scale: 0.97, transition: springs.snappy }}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
