"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { InspectorTextInput } from "./InspectorField";

const GRID_PRESETS = [
  { value: "repeat(2, 1fr)", label: "2 col", fractions: [1, 1] },
  { value: "repeat(3, 1fr)", label: "3 col", fractions: [1, 1, 1] },
  { value: "repeat(4, 1fr)", label: "4 col", fractions: [1, 1, 1, 1] },
  { value: "2fr 1fr", label: "2:1", fractions: [2, 1] },
  { value: "1fr 2fr", label: "1:2", fractions: [1, 2] },
  { value: "3fr 2fr", label: "3:2", fractions: [3, 2] },
] as const;

function normalizeTemplate(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function PresetButton({
  fractions,
  label,
  isActive,
  onClick,
}: {
  fractions: readonly number[];
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const total = fractions.reduce((a, b) => a + b, 0);
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex items-end gap-[2px] h-[36px] rounded-[2px] border px-1.5 py-1 transition-colors",
        isActive
          ? "border-[#1E5DF2] bg-[#D1E4FC]/30"
          : "border-[#E5E5E0] bg-[#FAFAF8] hover:border-[#D1D1CC]"
      )}
    >
      {fractions.map((fr, i) => (
        <div
          key={i}
          className={cn(
            "rounded-[1px] min-w-[4px]",
            isActive ? "bg-[#1E5DF2]/60" : "bg-[#A0A0A0]/30"
          )}
          style={{
            flex: fr / total,
            height: `${50 + (i % 2 === 0 ? 20 : 0)}%`,
          }}
        />
      ))}
    </button>
  );
}

export function GridTemplatePicker({
  value,
  onChange,
  onCommit,
}: {
  value: string;
  onChange: (value: string | undefined) => void;
  onCommit: () => void;
}) {
  const normalized = normalizeTemplate(value || "");
  const isCustom = normalized !== "" && !GRID_PRESETS.some(
    (p) => normalizeTemplate(p.value) === normalized
  );

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1">
        {GRID_PRESETS.map((preset) => (
          <PresetButton
            key={preset.value}
            fractions={preset.fractions}
            label={preset.label}
            isActive={normalizeTemplate(preset.value) === normalized}
            onClick={() => {
              onChange(preset.value);
              onCommit();
            }}
          />
        ))}
      </div>
      {/* Custom input for advanced templates */}
      <InspectorTextInput
        value={value || ""}
        placeholder="Custom: 1fr 2fr 1fr"
        className={cn(isCustom && "border-[#1E5DF2]")}
        onChange={(e) => {
          const v = (e.target as HTMLInputElement).value;
          onChange(v || undefined);
        }}
        onBlur={onCommit}
      />
    </div>
  );
}
