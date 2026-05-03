import type { IntentProfile } from "@/types/intent-profile";
import type { TasteProfile } from "@/types/taste-profile";
import type { DesignTasteValidationResult } from "./design-node-taste-validator";
import type { DesignKnobVector } from "./design-knobs";

export type DesignNodeTasteScore = {
  palette: number;
  typography: number;
  composition: number;
  imagery: number;
  components: number;
  intent: number;
  originality: number;
  overall: number;
  justification: string;
  mode: "deterministic" | "model" | "hybrid";
};

export function scoreDesignNodeTaste(args: {
  validation: DesignTasteValidationResult;
  tasteProfile: TasteProfile | null;
  intentProfile: IntentProfile | null;
  knobVector: DesignKnobVector;
}): DesignNodeTasteScore {
  const m = args.validation.metrics;
  const hardViolations = args.validation.violations.filter((v) => v.severity === "hard").length;
  const softViolations = args.validation.violations.length - hardViolations;
  const structureLeakageRaw = m.cardGridCount + m.statsPatternCount + m.logoBarCount + m.pricingPatternCount + m.testimonialPatternCount + m.iconRowCount;
  const structureSensitive =
    args.knobVector.components.cardGridLikelihood < 0.25 ||
    args.intentProfile?.businessGoal === "editorial" ||
    args.intentProfile?.businessGoal === "portfolio" ||
    args.tasteProfile?.archetypeMatch === "editorial-brand" ||
    args.tasteProfile?.archetypeMatch === "creative-portfolio";
  const structureLeakage = structureSensitive
    ? structureLeakageRaw
    : m.pricingPatternCount + m.testimonialPatternCount;
  const fullBleedTarget = args.knobVector.layout.fullBleedRatio;
  const fullBleedActual = m.sectionCount > 0 ? m.fullBleedSectionCount / m.sectionCount : 0;

  const palette = clamp10(10 - m.offPaletteColors.length * 1.2);
  const typography = clamp10(6 + Math.min(4, m.typeScaleRatio) - (args.knobVector.typography.scaleContrast > 0.7 && m.typeScaleRatio < 3 ? 2 : 0));
  const composition = clamp10(10 - hardViolations * 2.5 - softViolations * 0.7 - structureLeakage * 1.5);
  const imagery = clamp10(7 + (fullBleedActual >= fullBleedTarget * 0.6 ? 2 : -1) + Math.min(1, m.imageNodeCount + m.coverImageSectionCount));
  const components = clamp10(10 - m.shadowUsageCount * 0.35 - Math.max(0, m.buttonCount - m.textLinkCount - 1) * (args.knobVector.components.ctaProminence < 0.35 ? 1.2 : 0.2));
  const intent = clamp10(10 - structureLeakage * 1.8 - hardViolations * 1.5);
  const originality = clamp10(10 - repeatedTemplatePenalty(m) - structureLeakage);
  const overall = clamp10(
    palette * 0.1 +
    typography * 0.12 +
    composition * 0.24 +
    imagery * 0.14 +
    components * 0.12 +
    intent * 0.2 +
    originality * 0.08
  );

  return {
    palette,
    typography,
    composition,
    imagery,
    components,
    intent,
    originality,
    overall,
    justification: `Deterministic score from ${hardViolations} hard violations, ${softViolations} soft violations, ${structureLeakage} structural leaks.`,
    mode: "deterministic",
  };
}

export function passesDesignTasteScore(score: DesignNodeTasteScore, fidelityMode: "close" | "balanced" | "push"): boolean {
  const overallThreshold = fidelityMode === "close" ? 8 : fidelityMode === "push" ? 7 : 7.5;
  const compositionThreshold = fidelityMode === "close" ? 8 : 7;
  return score.overall >= overallThreshold &&
    score.composition >= compositionThreshold &&
    score.intent >= 7 &&
    score.originality >= 6.5;
}

function repeatedTemplatePenalty(metrics: { sectionCount: number; sectionHeightVariance: number; cardGridCount: number; statsPatternCount: number; logoBarCount: number }): number {
  let penalty = 0;
  if (metrics.sectionCount >= 7 && metrics.sectionHeightVariance < 60) penalty += 1.5;
  if (metrics.cardGridCount > 0 && metrics.statsPatternCount > 0 && metrics.logoBarCount > 0) penalty += 2.5;
  return penalty;
}

function clamp10(value: number): number {
  return Math.max(0, Math.min(10, Number(value.toFixed(2))));
}
