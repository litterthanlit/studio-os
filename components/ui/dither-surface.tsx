"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type PatternVariant = "grid" | "fade" | "band" | "noise";
export type PatternTone = "blue" | "ink" | "warm";
export type PatternDensity = "sm" | "md" | "lg";

type DitherSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  patternVariant?: PatternVariant;
  patternTone?: PatternTone;
  patternDensity?: PatternDensity;
  muted?: boolean;
};

export const DitherSurface = React.forwardRef<HTMLDivElement, DitherSurfaceProps>(
  (
    {
      className,
      patternVariant = "grid",
      patternTone = "blue",
      patternDensity = "md",
      muted = false,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        "surface-panel surface-panel-dither",
        muted && "surface-panel-muted",
        `pattern-${patternVariant}`,
        `tone-${patternTone}`,
        `density-${patternDensity}`,
        className
      )}
      {...props}
    />
  )
);

DitherSurface.displayName = "DitherSurface";
