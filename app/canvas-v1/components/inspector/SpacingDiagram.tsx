"use client";

/**
 * SpacingDiagram — Box model visualization for padding controls.
 *
 * Framer-style: Visual box model with dashed borders, labeled zones.
 * Shows padding on all four sides with inline numeric inputs.
 */

import * as React from "react";
import { InspectorNumberInput } from "./InspectorField";
import type { DesignNode, DesignNodeStyle } from "@/lib/canvas/design-node";

type SpacingDiagramProps = {
  node: DesignNode;
  style: DesignNodeStyle;
  onPaddingChange: (side: "top" | "right" | "bottom" | "left", value: number | undefined) => void;
  onHistoryFlush: () => void;
  hasOverride?: boolean;
  onResetOverride?: () => void;
};

export function SpacingDiagram({
  node,
  style,
  onPaddingChange,
  onHistoryFlush,
  hasOverride,
  onResetOverride,
}: SpacingDiagramProps) {
  const padding = style.padding || {};

  return (
    <div className="space-y-3">
      {/* Top padding */}
      <div className="flex justify-center">
        <div className="w-16">
          <InspectorNumberInput
            value={padding.top ?? ""}
            placeholder="0"
            min={0}
            onChange={(e) => onPaddingChange("top", Number(e.target.value) || undefined)}
            onBlur={onHistoryFlush}
          />
        </div>
      </div>

      {/* Box model visualization */}
      <div className="relative h-[100px] rounded-[4px] border border-dashed border-[#C5C5C0] dark:border-[#444444] bg-[#FAFAF8] dark:bg-[#1A1A1A]">
        {/* Background label */}
        <span className="absolute left-2 top-2 text-[9px] font-mono uppercase tracking-wider text-[#A0A0A0] dark:text-[#555555]">
          Margin
        </span>

        {/* Left padding */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-14">
          <InspectorNumberInput
            value={padding.left ?? ""}
            placeholder="0"
            min={0}
            onChange={(e) => onPaddingChange("left", Number(e.target.value) || undefined)}
            onBlur={onHistoryFlush}
          />
        </div>

        {/* Inner content box */}
        <div className="absolute inset-x-20 inset-y-4 rounded-[2px] border border-[#E5E5E0] dark:border-[#333333] bg-white dark:bg-[#222222] flex items-center justify-center">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#A0A0A0] dark:text-[#555555]">
            Content
          </span>
        </div>

        {/* Right padding */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-14">
          <InspectorNumberInput
            value={padding.right ?? ""}
            placeholder="0"
            min={0}
            onChange={(e) => onPaddingChange("right", Number(e.target.value) || undefined)}
            onBlur={onHistoryFlush}
          />
        </div>
      </div>

      {/* Bottom padding */}
      <div className="flex justify-center">
        <div className="w-16">
          <InspectorNumberInput
            value={padding.bottom ?? ""}
            placeholder="0"
            min={0}
            onChange={(e) => onPaddingChange("bottom", Number(e.target.value) || undefined)}
            onBlur={onHistoryFlush}
          />
        </div>
      </div>

      {/* Section label row */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[#6B6B6B] dark:text-[#999999]">Padding</span>
        {hasOverride && onResetOverride && (
          <button
            type="button"
            onClick={onResetOverride}
            className="text-[10px] font-mono text-[#4B57DB] hover:underline"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
