// lib/taste/intent-sliders.ts
// Intent sliders (master plan 1.7): a small set of designer-facing controls over
// the DesignKnobVector. Slider values are explicit taste — they are written to
// `userOverrides.knobs` (the explicit layer), win over derived knobs, and show
// up in the serialized knobs of the next prompt. "Restyle" regenerates with the
// delta since the last generation.

import { deriveDesignKnobs, mergeKnobPatches, type DeepPartial, type DesignKnobVector } from "@/lib/canvas/design-knobs";
import type { TasteProfile } from "@/types/taste-profile";

export type IntentSliderId =
  | "density"
  | "whitespaceDrama"
  | "asymmetry"
  | "scaleContrast"
  | "accentRestraint"
  | "chrome"
  | "imageryDominance"
  | "informationDensity";

export type IntentSlider = {
  id: IntentSliderId;
  label: string;
  /** Ends of the scale, for the accessible value text. */
  low: string;
  high: string;
  /** App outputs only. */
  appOnly?: boolean;
  read: (knobs: DesignKnobVector) => number;
  patch: (value: number) => DeepPartial<DesignKnobVector>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const INTENT_SLIDERS: readonly IntentSlider[] = [
  { id: "density", label: "Density", low: "airy", high: "packed", read: (k) => k.layout.density, patch: (v) => ({ layout: { density: v } }) },
  { id: "whitespaceDrama", label: "Whitespace drama", low: "even", high: "dramatic", read: (k) => k.layout.whitespaceDrama, patch: (v) => ({ layout: { whitespaceDrama: v } }) },
  { id: "asymmetry", label: "Asymmetry", low: "centered", high: "asymmetric", read: (k) => k.layout.asymmetry, patch: (v) => ({ layout: { asymmetry: v } }) },
  { id: "scaleContrast", label: "Scale contrast", low: "flat", high: "extreme", read: (k) => k.typography.scaleContrast, patch: (v) => ({ typography: { scaleContrast: v } }) },
  { id: "accentRestraint", label: "Accent restraint", low: "loud", high: "restrained", read: (k) => k.color.accentRestraint, patch: (v) => ({ color: { accentRestraint: v } }) },
  {
    id: "chrome",
    label: "Chrome",
    low: "bare",
    high: "rich",
    // Radius + shadow + border as one control (shadow at 0.8×; read from the two it sets 1:1).
    read: (k) => round2((k.components.radius + k.components.borderPresence) / 2),
    patch: (v) => ({ components: { radius: v, shadowDepth: round2(v * 0.8), borderPresence: v } }),
  },
  { id: "imageryDominance", label: "Imagery dominance", low: "text-led", high: "image-led", read: (k) => k.imagery.dominance, patch: (v) => ({ imagery: { dominance: v } }) },
  { id: "informationDensity", label: "Information density", low: "sparse", high: "dense", appOnly: true, read: (k) => k.content.copyDensity, patch: (v) => ({ content: { copyDensity: v } }) },
];

export function slidersFor(appOutput: boolean): IntentSlider[] {
  return INTENT_SLIDERS.filter((slider) => appOutput || !slider.appOnly);
}

/** 0–100 slider positions for the knobs a taste profile produces (derived + overrides). */
export function sliderValues(profile: TasteProfile | null | undefined): Record<IntentSliderId, number> {
  const knobs = deriveDesignKnobs({ tasteProfile: profile ?? null });
  return Object.fromEntries(INTENT_SLIDERS.map((s) => [s.id, Math.round(s.read(knobs) * 100)])) as Record<IntentSliderId, number>;
}

/** The profile with one slider written to the explicit layer (`userOverrides.knobs`). */
export function applySliderValue(profile: TasteProfile, id: IntentSliderId, value0to100: number): TasteProfile {
  const slider = INTENT_SLIDERS.find((s) => s.id === id);
  if (!slider) return profile;
  const value = Math.max(0, Math.min(100, Math.round(value0to100))) / 100;
  const knobs = mergeKnobPatches(profile.userOverrides?.knobs ?? {}, slider.patch(value));
  return { ...profile, userOverrides: { ...profile.userOverrides, knobs } };
}

/** Plain-language delta between two slider snapshots, for Restyle ("" when unchanged). */
export function describeSliderDelta(
  before: Record<IntentSliderId, number>,
  after: Record<IntentSliderId, number>,
  appOutput = false,
): string {
  return slidersFor(appOutput)
    .filter((s) => Math.abs((after[s.id] ?? 0) - (before[s.id] ?? 0)) >= 5)
    .map((s) => `${after[s.id]! > before[s.id]! ? "more" : "less"} ${s.label.toLowerCase()} (${before[s.id]} → ${after[s.id]})`)
    .join("; ");
}
