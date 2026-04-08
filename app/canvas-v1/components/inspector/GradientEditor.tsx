"use client";

import * as React from "react";
import type { GradientValue, GradientStop } from "@/lib/canvas/design-node";
import { ColorPickerPopover } from "../ColorPickerPopover";

type GradientEditorProps = {
  value: GradientValue;
  onChange: (gradient: GradientValue) => void;
};

const DEFAULT_STOPS: GradientStop[] = [
  { color: "#000000", position: 0 },
  { color: "#ffffff", position: 100 },
];

export function GradientEditor({ value, onChange }: GradientEditorProps) {
  const stops = value.stops.length >= 2 ? value.stops : DEFAULT_STOPS;

  // Per-stop popover open state and anchor refs
  const [openStopIndex, setOpenStopIndex] = React.useState<number | null>(null);
  const swatchRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const updateField = <K extends keyof GradientValue>(
    key: K,
    val: GradientValue[K]
  ) => {
    onChange({ ...value, [key]: val });
  };

  const updateStop = (index: number, changes: Partial<GradientStop>) => {
    const newStops = stops.map((s, i) =>
      i === index ? { ...s, ...changes } : s
    );
    onChange({ ...value, stops: newStops });
  };

  const addStop = () => {
    if (stops.length >= 8) return;
    const last = stops[stops.length - 1];
    const prev = stops[stops.length - 2];
    const midPos = Math.round((prev.position + last.position) / 2);
    const newStops = [
      ...stops.slice(0, -1),
      { color: "#888888", position: midPos },
      last,
    ];
    onChange({ ...value, stops: newStops });
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    onChange({ ...value, stops: stops.filter((_, i) => i !== index) });
  };

  const previewCSS = React.useMemo(() => {
    const stopsStr = stops
      .map((s) => `${s.color} ${s.position}%`)
      .join(", ");
    return `linear-gradient(90deg, ${stopsStr})`;
  }, [stops]);

  return (
    <div className="flex flex-col gap-2">
      {/* Type + Interpolation row */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-[2px] border border-[#E5E5E0] text-[11px]">
          <button
            type="button"
            className={`px-2 py-0.5 ${value.type === "linear" ? "bg-[#4B57DB] text-white" : "text-[#6B6B6B]"}`}
            onClick={() => updateField("type", "linear")}
          >
            Linear
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 ${value.type === "radial" ? "bg-[#4B57DB] text-white" : "text-[#6B6B6B]"}`}
            onClick={() => updateField("type", "radial")}
          >
            Radial
          </button>
        </div>
        <div className="flex rounded-[2px] border border-[#E5E5E0] text-[11px]">
          <button
            type="button"
            className={`px-2 py-0.5 ${(!value.interpolation || value.interpolation === "srgb") ? "bg-[#4B57DB] text-white" : "text-[#6B6B6B]"}`}
            onClick={() => updateField("interpolation", "srgb")}
          >
            sRGB
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 ${value.interpolation === "oklch" ? "bg-[#4B57DB] text-white" : "text-[#6B6B6B]"}`}
            onClick={() => updateField("interpolation", "oklch")}
          >
            OKLCh
          </button>
        </div>
      </div>

      {/* Angle (linear only) */}
      {value.type === "linear" && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#6B6B6B] w-10">Angle</span>
          <input
            type="number"
            value={value.angle ?? 180}
            onChange={(e) => updateField("angle", Number(e.target.value) || 0)}
            className="w-16 border border-[#E5E5E0] rounded-[2px] bg-white px-2 py-1 text-[12px] focus:border-[#D1E4FC] focus:ring-1 focus:ring-[#D1E4FC]/40"
          />
          <span className="text-[11px] text-[#A0A0A0]">deg</span>
        </div>
      )}

      {/* Gradient preview bar */}
      <div
        className="h-4 w-full rounded-[2px] border border-[#E5E5E0]"
        style={{ background: previewCSS }}
      />

      {/* Stop list */}
      <div className="flex flex-col gap-1">
        {stops.map((stop, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {/* Color swatch button — opens ColorPickerPopover */}
            <button
              ref={(el) => { swatchRefs.current[i] = el; }}
              type="button"
              className="h-5 w-5 rounded-[2px] border border-[#E5E5E0] flex-shrink-0"
              style={{ backgroundColor: stop.color }}
              onClick={() => setOpenStopIndex(openStopIndex === i ? null : i)}
              aria-label={`Pick color for stop ${i + 1}`}
            />
            <ColorPickerPopover
              open={openStopIndex === i}
              value={stop.color}
              anchorEl={swatchRefs.current[i] ?? null}
              onSelect={(color) => updateStop(i, { color })}
              onClose={() => setOpenStopIndex(null)}
            />
            <input
              type="number"
              value={stop.position}
              min={0}
              max={100}
              onChange={(e) =>
                updateStop(i, {
                  position: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                })
              }
              className="w-12 border border-[#E5E5E0] rounded-[2px] bg-white px-1.5 py-0.5 text-[11px] focus:border-[#D1E4FC] focus:ring-1 focus:ring-[#D1E4FC]/40"
            />
            <span className="text-[10px] text-[#A0A0A0]">%</span>
            {stops.length > 2 && (
              <button
                type="button"
                onClick={() => removeStop(i)}
                className="ml-auto text-[11px] text-[#A0A0A0] hover:text-red-500"
              >
                x
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add stop button */}
      {stops.length < 8 && (
        <button
          type="button"
          onClick={addStop}
          className="text-[11px] text-[#6B6B6B] hover:text-[#4B57DB] self-start"
        >
          + Add stop
        </button>
      )}
    </div>
  );
}
