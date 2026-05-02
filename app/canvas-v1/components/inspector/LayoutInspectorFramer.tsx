"use client";

/**
 * Framer-style Layout block: Type, Direction, Distribute, Align, Wrap, Gap (+ split),
 * grid template/rows, flex grow/shrink, overflow.
 */

import * as React from "react";
import {
  ArrowLeftRight,
  ArrowUpDown,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  StretchVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignNodeStyle } from "@/lib/canvas/design-node";
import {
  InspectorFieldRow,
  InspectorNumberInput,
  InspectorSelect,
  InspectorTextInput,
} from "./InspectorField";
import { InspectorSegmented } from "./InspectorSegmented";
import { GridTemplatePicker } from "./GridTemplatePicker";
import { InspectorDrawerSection } from "./InspectorDrawerSection";

type LayoutInspectorFramerProps = {
  style: DesignNodeStyle;
  applyImmediate: (patch: Partial<DesignNodeStyle>, description: string) => void;
  updateStyle: (patch: Partial<DesignNodeStyle>) => void;
  historyFlush: () => void;
  hasOverride: (property: keyof DesignNodeStyle) => boolean;
  resetOverride: (property: keyof DesignNodeStyle) => void;
  isForbiddenField: (field: string) => boolean;
  /** Padding / box spacing — rendered last inside Layout (e.g. SpacingDiagram). */
  trailingContent?: React.ReactNode;
};

const JUSTIFY_OPTIONS: { value: NonNullable<DesignNodeStyle["justifyContent"]>; label: string }[] = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "space-between", label: "Space between" },
];

const ALIGN_OPTIONS: {
  value: NonNullable<DesignNodeStyle["alignItems"]>;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
}[] = [
  { value: "flex-start", Icon: AlignStartVertical, title: "Start" },
  { value: "center", Icon: AlignCenterVertical, title: "Center" },
  { value: "flex-end", Icon: AlignEndVertical, title: "End" },
  { value: "stretch", Icon: StretchVertical, title: "Stretch" },
];

export function LayoutInspectorFramer({
  style,
  applyImmediate,
  updateStyle,
  historyFlush,
  hasOverride,
  resetOverride,
  isForbiddenField,
  trailingContent,
}: LayoutInspectorFramerProps) {
  const display = style.display ?? "flex";
  const isGrid = display === "grid";
  const isFlex = display === "flex";

  const gapValue = style.gap;
  const gapStr = String(gapValue ?? 0);
  const gapParts = typeof gapValue === "string" ? gapStr.split(/\s+/) : null;
  const rowGap = gapParts?.length === 2 ? Number(gapParts[0]) : Number(gapValue ?? 0);
  const colGap = gapParts?.length === 2 ? Number(gapParts[1]) : Number(gapValue ?? 0);
  const isSplit = gapParts?.length === 2;
  const uniformGap = Number.isFinite(rowGap) ? rowGap : 0;

  const justifyVal = style.justifyContent ?? "flex-start";
  const alignVal = style.alignItems ?? "stretch";
  const wrapVal = style.flexWrap === "wrap";

  return (
    <InspectorDrawerSection title="Layout">
      <div className="px-3 space-y-1 pb-2">
        <InspectorFieldRow label="Type" disabled={isForbiddenField("display")}>
          <InspectorSegmented
            value={display}
            options={[
              { value: "flex", label: "Stack" },
              { value: "grid", label: "Grid" },
            ]}
            onChange={(v) => applyImmediate({ display: v as "flex" | "grid" }, "Changed layout type")}
          />
        </InspectorFieldRow>

        {isFlex && (
          <InspectorFieldRow
            label="Direction"
            hasOverride={hasOverride("flexDirection")}
            onResetOverride={() => resetOverride("flexDirection")}
            disabled={isForbiddenField("flexDirection")}
          >
            <InspectorSegmented
              value={style.flexDirection || "column"}
              options={[
                { value: "row", label: "", icon: ArrowLeftRight },
                { value: "column", label: "", icon: ArrowUpDown },
              ]}
              onChange={(v) => applyImmediate({ flexDirection: v as "row" | "column" }, "Changed direction")}
            />
          </InspectorFieldRow>
        )}

        <InspectorFieldRow
          label="Distribute"
          hasOverride={hasOverride("justifyContent")}
          onResetOverride={() => resetOverride("justifyContent")}
          disabled={isForbiddenField("justifyContent")}
        >
          <InspectorSelect
            value={justifyVal}
            onChange={(e) => {
              const v = e.target.value as DesignNodeStyle["justifyContent"];
              applyImmediate({ justifyContent: v }, "Changed distribute");
            }}
          >
            {JUSTIFY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </InspectorSelect>
        </InspectorFieldRow>

        <InspectorFieldRow
          label="Align"
          hasOverride={hasOverride("alignItems")}
          onResetOverride={() => resetOverride("alignItems")}
          disabled={isForbiddenField("alignItems")}
        >
          <div
            className={cn(
              "flex rounded-md bg-[#EBEBE8] dark:bg-[#2A2A2A] p-0.5 gap-0.5 h-6 min-h-[24px] w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-none"
            )}
            role="group"
            aria-label="Align items"
          >
            {ALIGN_OPTIONS.map(({ value, Icon, title }) => {
              const active = alignVal === value;
              return (
                <button
                  key={value}
                  type="button"
                  title={title}
                  className={cn(
                    "flex-1 flex items-center justify-center rounded-md transition-all duration-100",
                    active
                      ? "bg-white text-[#4B57DB] shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:bg-[#333333] dark:text-[#7B8CFF]"
                      : "text-[#8A8A8A] hover:text-[#5C5C5C] dark:text-[#666666] dark:hover:text-[#D0D0D0]"
                  )}
                  onClick={() => applyImmediate({ alignItems: value }, "Changed align")}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </InspectorFieldRow>

        {isFlex && (
          <InspectorFieldRow
            label="Wrap"
            hasOverride={hasOverride("flexWrap")}
            onResetOverride={() => resetOverride("flexWrap")}
            disabled={isForbiddenField("flexWrap")}
          >
            <InspectorSegmented
              value={wrapVal ? "yes" : "no"}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              onChange={(v) =>
                applyImmediate({ flexWrap: v === "yes" ? "wrap" : "nowrap" }, "Changed wrap")
              }
            />
          </InspectorFieldRow>
        )}

        <InspectorFieldRow
          label="Gap"
          hasOverride={hasOverride("gap")}
          onResetOverride={() => resetOverride("gap")}
          disabled={isForbiddenField("gap")}
        >
          <div className="flex items-center gap-1.5 w-full min-w-0">
            {isSplit ? (
              <>
                <div className="flex-1 min-w-0">
                  <InspectorNumberInput
                    value={rowGap}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      updateStyle({ gap: `${next} ${colGap}` });
                    }}
                    onBlur={() => historyFlush()}
                    min={0}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <InspectorNumberInput
                    value={colGap}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      updateStyle({ gap: `${rowGap} ${next}` });
                    }}
                    onBlur={() => historyFlush()}
                    min={0}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <InspectorNumberInput
                  value={uniformGap}
                  onChange={(e) => updateStyle({ gap: Number(e.target.value) || undefined })}
                  onBlur={() => historyFlush()}
                  min={0}
                />
                <input
                  type="range"
                  min={0}
                  max={120}
                  value={Math.min(120, Math.max(0, uniformGap))}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    updateStyle({ gap: n || undefined });
                  }}
                  onMouseUp={() => historyFlush()}
                  onKeyUp={() => historyFlush()}
                  className="w-14 shrink-0 h-1 accent-[#4B57DB] cursor-pointer"
                  aria-label="Gap"
                />
              </div>
            )}
            <button
              type="button"
              className="w-5 h-5 shrink-0 flex items-center justify-center text-text-muted hover:text-text-primary"
              onClick={() => {
                if (isSplit) {
                  applyImmediate({ gap: rowGap }, "Set uniform gap");
                } else {
                  applyImmediate({ gap: `${uniformGap} ${uniformGap}` }, "Split gap");
                }
              }}
              title={isSplit ? "Uniform gap" : "Split row and column gap"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                {isSplit ? <path d="M3 6h6" /> : <path d="M3 6h6M6 3v6" />}
              </svg>
            </button>
          </div>
        </InspectorFieldRow>

        {isGrid && (
          <>
            {/* Full-width preset grid: label row + stacked picker (avoids cramming tall UI in one field row). */}
            <div
              className={cn(
                "flex flex-col gap-2 w-full",
                isForbiddenField("gridTemplate") && "opacity-50 pointer-events-none"
              )}
              title={isForbiddenField("gridTemplate") ? "Controlled by master component" : undefined}
            >
              <div className="flex items-start min-h-7 gap-2.5 py-0.5">
                <span
                  className={cn(
                    "w-14 shrink-0 pt-1 text-[11px] font-normal flex items-start gap-1.5",
                    isForbiddenField("gridTemplate")
                      ? "text-[#A0A0A0]"
                      : "text-[#6B6B6B] dark:text-[#999999]"
                  )}
                >
                  {hasOverride("gridTemplate") && !isForbiddenField("gridTemplate") && (
                    <button
                      type="button"
                      title="Overridden — click to reset to desktop"
                      className="w-1.5 h-1.5 rounded-full bg-[#4B57DB] shrink-0 hover:ring-2 hover:ring-[#D1E4FC] dark:hover:ring-[#222244] transition-shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetOverride("gridTemplate");
                      }}
                    />
                  )}
                  Template
                </span>
              </div>
              <div className="w-full min-w-0">
                <GridTemplatePicker
                  value={style.gridTemplate || ""}
                  onChange={(v) => updateStyle({ gridTemplate: v })}
                  onCommit={() => historyFlush()}
                />
              </div>
            </div>

            <InspectorFieldRow
              label="Rows"
              hasOverride={hasOverride("gridTemplateRows")}
              onResetOverride={() => resetOverride("gridTemplateRows")}
            >
              <InspectorTextInput
                value={style.gridTemplateRows ?? ""}
                placeholder="auto"
                onChange={(e) => updateStyle({ gridTemplateRows: e.target.value || undefined })}
                onBlur={(e) => {
                  historyFlush();
                  const v = e.target.value;
                  applyImmediate(
                    { gridTemplateRows: v || undefined },
                    v ? `Set grid rows: ${v}` : "Remove grid rows"
                  );
                }}
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              />
            </InspectorFieldRow>
          </>
        )}

        {isFlex && (
          <div className="flex gap-2">
            <InspectorFieldRow label="Grow" className="flex-1">
              <InspectorNumberInput
                value={style.flexGrow ?? 0}
                min={0}
                step={1}
                onChange={(e) => updateStyle({ flexGrow: Number(e.target.value) || 0 })}
                onBlur={() => historyFlush()}
              />
            </InspectorFieldRow>
            <InspectorFieldRow label="Shrink" className="flex-1">
              <InspectorNumberInput
                value={style.flexShrink ?? 1}
                min={0}
                step={1}
                onChange={(e) => updateStyle({ flexShrink: Number(e.target.value) })}
                onBlur={() => historyFlush()}
              />
            </InspectorFieldRow>
          </div>
        )}

        {trailingContent != null ? (
          <div className="border-t border-[var(--border-subtle)] dark:border-[#2A2A2A] pt-3 mt-1">{trailingContent}</div>
        ) : null}

      </div>
    </InspectorDrawerSection>
  );
}
