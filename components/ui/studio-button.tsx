"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StudioButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center rounded-[4px] text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1E4FC]/50 dark:focus-visible:ring-[#4B57DB]/40 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<StudioButtonVariant, string> = {
  primary:
    "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] px-3 py-2 hover:opacity-90",
  secondary:
    "border border-[var(--border-primary)] bg-transparent text-[var(--text-secondary)] px-3 py-2 hover:border-[var(--border-hover)] hover:text-[var(--accent)]",
  ghost:
    "border border-[var(--border-primary)] bg-transparent text-[var(--text-secondary)] px-3 py-2 text-[12px] hover:border-[var(--border-hover)] hover:text-[var(--accent)]",
};

export type StudioButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: StudioButtonVariant;
};

export function StudioButton({
  className,
  variant = "primary",
  type = "button",
  ...props
}: StudioButtonProps) {
  return (
    <button type={type} className={cn(base, variants[variant], className)} {...props} />
  );
}
