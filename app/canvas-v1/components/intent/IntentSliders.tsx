"use client";

// Intent sliders (master plan 1.7): designer-facing controls over the design
// knobs. Values are explicit taste (userOverrides.knobs); Restyle regenerates
// with the delta since the last restyle / generation.

import * as React from "react";
import { ChevronDown, Wand2 } from "lucide-react";
import {
  describeSliderDelta,
  slidersFor,
  sliderValues,
  type IntentSliderId,
} from "@/lib/taste/intent-sliders";
import type { TasteProfile } from "@/types/taste-profile";

type IntentSlidersProps = {
  tasteProfile: TasteProfile | null;
  /** Show the app-only sliders (information density). */
  appOutput: boolean;
  /** Changes the slider baseline (e.g. a new generation finished). */
  baselineKey: string;
  disabled?: boolean;
  onChange: (id: IntentSliderId, value: number) => void;
  /** Regenerate with the described delta. Omitted → no Restyle button. */
  onRestyle?: (delta: string) => void;
};

export function IntentSliders({ tasteProfile, appOutput, baselineKey, disabled, onChange, onRestyle }: IntentSlidersProps) {
  const [open, setOpen] = React.useState(false);
  const values = React.useMemo(() => sliderValues(tasteProfile), [tasteProfile]);
  const [baseline, setBaseline] = React.useState(values);
  // A new generation (or the taste profile arriving) resets what "Restyle" compares against.
  const baselineKeyWithTaste = `${baselineKey}:${tasteProfile ? "taste" : "none"}`;
  const [baselineFor, setBaselineFor] = React.useState(baselineKeyWithTaste);
  if (baselineFor !== baselineKeyWithTaste) {
    setBaselineFor(baselineKeyWithTaste);
    setBaseline(values);
  }
  const delta = describeSliderDelta(baseline, values, appOutput);
  const sliders = slidersFor(appOutput);
  const inactive = disabled || !tasteProfile;
  const panelId = React.useId();

  return (
    <section aria-label="Intent sliders" className="border-b border-[#E5E5E0] dark:border-[#333333]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#D1E4FC]"
      >
        <span className="mono-kicker">Intent</span>
        <span className="flex items-center gap-2">
          {delta && <span className="font-mono text-[10px] text-[#4B57DB]">changed</span>}
          <ChevronDown size={16} strokeWidth={1.5} className={`text-[#A0A0A0] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div id={panelId} className="flex flex-col gap-2.5 px-3 pb-3">
          {!tasteProfile && (
            <p className="text-[11px] text-[#6B6B6B] dark:text-[#A0A0A0]">Generate or refresh taste first — sliders adjust a taste profile.</p>
          )}
          {sliders.map((slider) => {
            const id = `${panelId}-${slider.id}`;
            const value = values[slider.id];
            return (
              <div key={slider.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label htmlFor={id} className="text-[11px] text-[#1A1A1A] dark:text-[#D0D0D0]">
                    {slider.label}
                  </label>
                  <span className="font-mono text-[10px] tabular-nums text-[#A0A0A0]" aria-hidden="true">
                    {value}
                  </span>
                </div>
                <input
                  id={id}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={value}
                  disabled={inactive}
                  aria-valuetext={`${value} of 100 (${slider.low} to ${slider.high})`}
                  onChange={(e) => onChange(slider.id, Number(e.target.value))}
                  className="h-4 w-full cursor-pointer accent-[#4B57DB] outline-none focus-visible:ring-2 focus-visible:ring-[#D1E4FC] disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex justify-between text-[10px] text-[#A0A0A0]" aria-hidden="true">
                  <span>{slider.low}</span>
                  <span>{slider.high}</span>
                </div>
              </div>
            );
          })}
          {onRestyle && (
            <button
              type="button"
              disabled={inactive || !delta}
              onClick={() => {
                onRestyle(delta);
                setBaseline(values);
              }}
              title={delta ? `Restyle: ${delta}` : "Move a slider to restyle"}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-[4px] border border-[#E5E5E0] bg-white px-2 py-1.5 text-[11px] text-[#1A1A1A] outline-none transition-colors hover:border-[#4B57DB] focus-visible:ring-2 focus-visible:ring-[#D1E4FC] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#333333] dark:bg-[#222222] dark:text-[#D0D0D0]"
            >
              <Wand2 size={16} strokeWidth={1.5} aria-hidden="true" />
              Restyle
            </button>
          )}
        </div>
      )}
    </section>
  );
}
