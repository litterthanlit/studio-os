"use client";

/**
 * SpacingDiagram — Padding-only box model (Framer-like).
 * Section header already says SPACING; inner chrome stays minimal.
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

const edgeInputClass =
  "h-6 w-full min-w-[2.25rem] max-w-[3rem] cursor-text text-center text-[11px] tabular-nums px-1 py-0 pr-1";

function PadField({
  side,
  value,
  onPaddingChange,
  onHistoryFlush,
}: {
  side: "top" | "right" | "bottom" | "left";
  value: number | "";
  onPaddingChange: SpacingDiagramProps["onPaddingChange"];
  onHistoryFlush: () => void;
}) {
  const label =
    side === "top"
      ? "Padding top (px)"
      : side === "bottom"
        ? "Padding bottom (px)"
        : side === "left"
          ? "Padding left (px)"
          : "Padding right (px)";

  return (
    <InspectorNumberInput
      aria-label={label}
      value={value}
      placeholder="0"
      min={0}
      onChange={(e) => {
        const v = e.target.value;
        onPaddingChange(side, v === "" ? undefined : Number(v));
      }}
      onBlur={onHistoryFlush}
      className={edgeInputClass}
    />
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
    <div className="space-y-2">
      <div className="rounded-[6px] border border-dashed border-[#E5E5E0] bg-[#FAFAF8] p-2.5 dark:border-[#404040] dark:bg-[#1A1A1A]">
        <div className="flex flex-col gap-2">
          <div className="flex justify-center px-2">
            <div className="w-full max-w-[3rem]">
              <PadField
                side="top"
                value={padding.top ?? ""}
                onPaddingChange={onPaddingChange}
                onHistoryFlush={onHistoryFlush}
              />
            </div>
          </div>

          <div className="flex min-h-[2.75rem] items-center gap-2">
            <div className="flex w-9 shrink-0 items-center justify-center">
              <PadField
                side="left"
                value={padding.left ?? ""}
                onPaddingChange={onPaddingChange}
                onHistoryFlush={onHistoryFlush}
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center px-2">
              <div
                className="h-5 w-12 shrink-0 rounded-[3px] bg-[#EFEFEC] dark:bg-[#333333]"
                aria-hidden
              />
            </div>

            <div className="flex w-9 shrink-0 items-center justify-center">
              <PadField
                side="right"
                value={padding.right ?? ""}
                onPaddingChange={onPaddingChange}
                onHistoryFlush={onHistoryFlush}
              />
            </div>
          </div>

          <div className="flex justify-center px-2">
            <div className="w-full max-w-[3rem]">
              <PadField
                side="bottom"
                value={padding.bottom ?? ""}
                onPaddingChange={onPaddingChange}
                onHistoryFlush={onHistoryFlush}
              />
            </div>
          </div>
        </div>
      </div>

      {hasOverride && onResetOverride ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onResetOverride}
            className="text-[10px] font-mono text-[#4B57DB] hover:underline"
          >
            Reset padding
          </button>
        </div>
      ) : null}
    </div>
  );
}
