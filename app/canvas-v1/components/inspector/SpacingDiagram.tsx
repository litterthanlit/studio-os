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

const SIDE_CORNERS: Record<"top" | "right" | "bottom" | "left", string> = {
  top: "TL · TR",
  right: "TR · BR",
  bottom: "BL · BR",
  left: "TL · BL",
};

function SidePadInput({
  side,
  label,
  value,
  onPaddingChange,
  onHistoryFlush,
}: {
  side: "top" | "right" | "bottom" | "left";
  label: string;
  value: number | "";
  onPaddingChange: SpacingDiagramProps["onPaddingChange"];
  onHistoryFlush: () => void;
}) {
  const corners = SIDE_CORNERS[side];
  return (
    <div className="flex w-full min-w-[3.25rem] flex-col items-stretch gap-1">
      <label
        htmlFor={`padding-${side}`}
        className="flex flex-col items-center gap-0.5 text-center"
      >
        <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[var(--text-secondary)]">
          {label}
        </span>
        <span className="text-[9px] font-mono tabular-nums tracking-wide text-[var(--text-muted)]">
          {corners}
        </span>
      </label>
      <div className="w-full">
        <InspectorNumberInput
          id={`padding-${side}`}
          value={value}
          placeholder="0"
          min={0}
          aria-label={`${label} padding (${corners}) in pixels`}
          title={`${label} padding — affects ${corners} (px)`}
          onChange={(e) => {
            const val = e.target.value;
            onPaddingChange(side, val === "" ? undefined : Number(val));
          }}
          onBlur={onHistoryFlush}
        />
      </div>
    </div>
  );
}

export function SpacingDiagram({
  node: _node,
  style,
  onPaddingChange,
  onHistoryFlush,
  hasOverride,
  onResetOverride,
}: SpacingDiagramProps) {
  const padding = style.padding || {};

  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-snug text-[#A0A0A0] dark:text-[#666666]">
        Each value is padding for that side (px). Corner tags show which corners that side touches (TL top-left, TR, BL, BR).
      </p>

      {/* Top padding */}
      <div className="flex justify-center">
        <SidePadInput
          side="top"
          label="Top"
          value={padding.top ?? ""}
          onPaddingChange={onPaddingChange}
          onHistoryFlush={onHistoryFlush}
        />
      </div>

      {/* Box model visualization — dashed region = padding band */}
      <div className="relative min-h-[112px] rounded-[4px] border border-dashed border-[#C5C5C0] dark:border-[#444444] bg-[#FAFAF8] dark:bg-[#1A1A1A]">
        <span className="absolute left-2 top-2 text-[9px] font-mono uppercase tracking-wider text-[#A0A0A0] dark:text-[#555555]">
          Padding
        </span>

        {/* Left padding */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <SidePadInput
            side="left"
            label="Left"
            value={padding.left ?? ""}
            onPaddingChange={onPaddingChange}
            onHistoryFlush={onHistoryFlush}
          />
        </div>

        {/* Inner content box */}
        <div className="absolute inset-x-20 inset-y-4 rounded-[2px] border border-[#E5E5E0] dark:border-[#333333] bg-white dark:bg-[#222222] flex items-center justify-center">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#A0A0A0] dark:text-[#555555]">
            Content
          </span>
        </div>

        {/* Right padding */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <SidePadInput
            side="right"
            label="Right"
            value={padding.right ?? ""}
            onPaddingChange={onPaddingChange}
            onHistoryFlush={onHistoryFlush}
          />
        </div>
      </div>

      {/* Bottom padding */}
      <div className="flex justify-center">
        <SidePadInput
          side="bottom"
          label="Bottom"
          value={padding.bottom ?? ""}
          onPaddingChange={onPaddingChange}
          onHistoryFlush={onHistoryFlush}
        />
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
