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
      "rounded-md bg-card-bg text-text-primary transition-all duration-150 ease-out",
      active
        ? "border-2 border-[var(--accent)] shadow-[inset_0_0_12px_#FAFBFE]"
        : "border border-card-border",
      interactive && !active && "hover:bg-[#F4F8FF] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:border-border-hover cursor-pointer active:opacity-95",
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
      "text-[13px] font-medium text-text-secondary uppercase tracking-wide",
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
