"use client";

/**
 * Visual grouping for inspector — stacked paper drawers with breathing room between clusters.
 * Screen readers get a cluster label; the rail stays uncluttered.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export function InspectorSectionCluster({
  isFirst,
  ariaLabel,
  children,
}: {
  isFirst?: boolean;
  /** Accessible name for the group (not shown). */
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "space-y-2",
        !isFirst && "border-t border-[var(--border-subtle)] pt-10 dark:border-[#2A2A2A]",
      )}
    >
      {children}
    </div>
  );
}
