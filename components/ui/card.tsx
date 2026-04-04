'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { active?: boolean; interactive?: boolean }
>(({ className, active, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "surface-panel rounded-[4px] bg-card-bg text-text-primary transition-all duration-150 ease-out",
      active
        ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent),0_16px_40px_rgba(75,87,219,0.08)]"
        : "border border-card-border",
      interactive && !active && "hover:bg-[#F5F5F0] hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(17,17,17,0.05)] hover:border-border-hover cursor-pointer active:opacity-95",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 text-[14px] text-text-primary", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 border-t border-card-border", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export const StatCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    value: React.ReactNode;
    label: string;
    indicatorColor?: string;
    active?: boolean;
  }
>(({ className, value, label, indicatorColor, active, ...props }, ref) => (
  <Card ref={ref} active={active} className={cn("p-6 flex flex-col justify-center", className)} {...props}>
    <div className="text-[28px] font-semibold text-text-primary font-sans leading-none tracking-tight">
      {value}
    </div>
    <div className="flex items-center gap-1.5 mt-2">
      {indicatorColor && (
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: indicatorColor }} />
      )}
      <div className="text-[12px] text-text-secondary">
        {label}
      </div>
    </div>
  </Card>
));
StatCard.displayName = "StatCard";
