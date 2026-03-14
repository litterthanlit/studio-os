// lib/ai/taste-profile-compat.ts
// Backward-compatible adapter for files that haven't been migrated to the
// new TasteProfile schema yet. Import toLegacy() and wrap the profile at
// the function entry point — no other changes needed in the consumer file.

import type { TasteProfile } from "@/types/taste-profile";

export type LegacyTasteProfile = {
  summary: string;
  adjectives: string[];
  layoutBias: {
    density: string;
    gridStyle: string;
    whitespacePreference: string;
    heroStyle: string;
  };
  typographyTraits: {
    headingMood: string;
    bodyMood: string;
    scale: string;
    suggestedPairings: string[];
  };
  colorBehavior: {
    palette: string[];
    dominantMood: string;
    contrast: string;
    backgroundPreference: string;
  };
  imageTreatment: {
    style: string;
    mood: string;
    corners: string;
    overlays: string;
  };
  ctaTone: "aggressive" | "subtle" | "minimal";
  avoid: string[];
  confidence: number;
};

export function toLegacy(p: TasteProfile): LegacyTasteProfile {
  return {
    summary: p.summary,
    adjectives: p.adjectives,
    layoutBias: {
      density: p.layoutBias.density,
      gridStyle: p.layoutBias.gridBehavior,
      whitespacePreference: p.layoutBias.whitespaceIntent,
      heroStyle: p.layoutBias.heroStyle,
    },
    typographyTraits: {
      headingMood: p.typographyTraits.headingTone,
      bodyMood: p.typographyTraits.bodyTone,
      scale: p.typographyTraits.scale,
      suggestedPairings: p.typographyTraits.recommendedPairings,
    },
    colorBehavior: {
      palette: [
        p.colorBehavior.suggestedColors.background,
        p.colorBehavior.suggestedColors.surface,
        p.colorBehavior.suggestedColors.text,
        p.colorBehavior.suggestedColors.accent,
        ...(p.colorBehavior.suggestedColors.secondary
          ? [p.colorBehavior.suggestedColors.secondary]
          : []),
      ].filter(Boolean) as string[],
      dominantMood: p.colorBehavior.mode,
      contrast: p.typographyTraits.contrast,
      backgroundPreference: p.colorBehavior.suggestedColors.background,
    },
    imageTreatment: {
      style: p.imageTreatment.style,
      mood: p.imageTreatment.treatment,
      corners: p.imageTreatment.cornerRadius,
      overlays: "minimal",
    },
    ctaTone:
      p.ctaTone.style === "bold"
        ? "aggressive"
        : p.ctaTone.style === "understated"
        ? "subtle"
        : "minimal",
    avoid: p.avoid,
    confidence: p.confidence,
  };
}
