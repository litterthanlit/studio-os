"use client";

import * as React from "react";
import { Maximize2 } from "lucide-react";
import { useCanvas } from "@/lib/canvas/canvas-context";
import type { PageNodeStyle, PageNodeType } from "@/lib/canvas/compose";
import { InspectorLabel, InspectorNumberInput, InspectorSliderField } from "./InspectorField";

type SpacingDiagramProps = {
  artboardId: string;
  nodeId: string;
  nodeType: PageNodeType;
  style: PageNodeStyle;
  onHistorySchedule: (description: string) => void;
  onHistoryFlush: () => void;
};

function parseNumericInput(value: string): number | undefined {
  if (value === "") return undefined;
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : undefined;
}

export function SpacingDiagram({
  artboardId,
  nodeId,
  nodeType,
  style,
  onHistorySchedule,
  onHistoryFlush,
}: SpacingDiagramProps) {
  const { dispatch } = useCanvas();
  const paddingX = style.paddingX;
  const paddingY = style.paddingY;
  const valuesMatch = paddingX === paddingY;
  const [expanded, setExpanded] = React.useState(!valuesMatch);

  React.useEffect(() => {
    if (!valuesMatch) {
      setExpanded(true);
    }
  }, [valuesMatch]);

  const commitStyle = React.useCallback(
    (nextStyle: Partial<PageNodeStyle>) => {
      dispatch({
        type: "UPDATE_NODE_STYLE",
        artboardId,
        nodeId,
        style: nextStyle,
      });
      onHistorySchedule(`Styled ${nodeType}`);
    },
    [artboardId, dispatch, nodeId, nodeType, onHistorySchedule]
  );

  const handleAxisChange = React.useCallback(
    (axis: "paddingX" | "paddingY", rawValue: string) => {
      const nextValue = parseNumericInput(rawValue);
      commitStyle(
        axis === "paddingX"
          ? { paddingX: nextValue }
          : { paddingY: nextValue }
      );
    },
    [commitStyle]
  );

  const handleUnifiedPaddingChange = React.useCallback(
    (rawValue: string) => {
      const nextValue = parseNumericInput(rawValue);
      commitStyle({ paddingX: nextValue, paddingY: nextValue });
    },
    [commitStyle]
  );

  const handleGapChange = React.useCallback(
    (rawValue: string) => {
      commitStyle({ gap: parseNumericInput(rawValue) });
    },
    [commitStyle]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        onHistoryFlush();
        event.currentTarget.blur();
      }
    },
    [onHistoryFlush]
  );

  const numberInputClassName = "w-14 text-center text-[12px]";
  const shouldShowDiagram = expanded || !valuesMatch;

  return (
    <div>
      {shouldShowDiagram ? (
        <div className="rounded-[6px] border border-[#E5E5E0] dark:border-[#333333] bg-[#FAFAF8] dark:bg-[#222222] p-3">
          <div className="flex justify-center">
            <InspectorNumberInput
              value={paddingY ?? ""}
              placeholder="0"
              className={numberInputClassName}
              onChange={(event) => handleAxisChange("paddingY", event.target.value)}
              onBlur={onHistoryFlush}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="relative mt-2 h-[120px] rounded-[4px] border border-[#E5E5E0] dark:border-[#333333] bg-white/70 dark:bg-[#1A1A1A]/70">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <InspectorNumberInput
                value={paddingX ?? ""}
                placeholder="0"
                className={numberInputClassName}
                onChange={(event) => handleAxisChange("paddingX", event.target.value)}
                onBlur={onHistoryFlush}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="absolute inset-x-[70px] inset-y-[22px] flex items-center justify-center rounded-[4px] border border-[#E5E5E0] dark:border-[#333333]">
              <div className="mx-auto h-8 w-12 border border-dashed border-[#E5E5E0] dark:border-[#333333]" />
            </div>

            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <InspectorNumberInput
                value={paddingX ?? ""}
                placeholder="0"
                className={numberInputClassName}
                onChange={(event) => handleAxisChange("paddingX", event.target.value)}
                onBlur={onHistoryFlush}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <div className="mt-2 flex justify-center">
            <InspectorNumberInput
              value={paddingY ?? ""}
              placeholder="0"
              className={numberInputClassName}
              onChange={(event) => handleAxisChange("paddingY", event.target.value)}
              onBlur={onHistoryFlush}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div>
            <InspectorLabel className="mb-1">Padding</InspectorLabel>
            <InspectorNumberInput
              value={paddingX ?? ""}
              placeholder="0"
              className={numberInputClassName}
              onChange={(event) => handleUnifiedPaddingChange(event.target.value)}
              onBlur={onHistoryFlush}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            type="button"
            className="mb-[2px] flex h-7 w-7 items-center justify-center rounded-[2px] border border-[#E5E5E0] dark:border-[#333333] bg-[#FAFAF8] dark:bg-[#222222] text-[#8A8A8A] dark:text-[#555555] transition-colors hover:border-[#D1E4FC] dark:hover:border-[#4B57DB] hover:text-[#4B57DB]"
            onClick={() => setExpanded(true)}
            aria-label="Expand padding diagram"
            title="Expand padding diagram"
          >
            <Maximize2 size={10} />
          </button>
        </div>
      )}

      <div className="mt-3">
        <InspectorSliderField
          label="Gap"
          value={style.gap ?? 0}
          min={0}
          max={100}
          step={1}
          onChange={(val) => {
            handleGapChange(val === 0 ? "" : String(val));
            onHistoryFlush();
          }}
        />
      </div>
    </div>
  );
}
