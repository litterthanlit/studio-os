import type { TasteProfile } from "@/types/taste-profile";
import type { IntentProfile } from "@/types/intent-profile";
import type { CompositionAnalysis } from "@/types/composition-analysis";
import type { FidelityMode } from "./directive-compiler";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type DesignKnobVector = {
  layout: {
    sectionCount: { min: number; max: number };
    density: number;
    whitespaceDrama: number;
    asymmetry: number;
    rhythmVariation: number;
    fullBleedRatio: number;
    overlapDepth: number;
    gridStrictness: number;
    sectionHeightVariance: number;
  };
  typography: {
    scaleContrast: number;
    editorialSerifBias: number;
    weightVariance: number;
    letterSpacingIntent: "neutral" | "tracked" | "tight-display";
    casing: "mixed" | "uppercase" | "lowercase";
    bodyTone: "neutral" | "warm" | "technical" | "literary";
  };
  color: {
    mode: "light" | "dark" | "mixed" | "adaptive";
    temperature: number;
    saturation: number;
    contrast: number;
    accentRestraint: number;
    palette: string[];
  };
  imagery: {
    dominance: number;
    cropDrama: number;
    subjectSpecificity: number;
    treatment: "raw" | "filtered" | "duotone" | "high-contrast" | "desaturated";
    role: "hero" | "supporting" | "texture" | "product" | "documentary";
  };
  components: {
    radius: number;
    shadowDepth: number;
    borderPresence: number;
    iconUsage: number;
    ctaProminence: number;
    cardGridLikelihood: number;
  };
  content: {
    copyDensity: number;
    tone: string;
    conversionPressure: number;
    narrativeDepth: number;
  };
};

const baseKnobs: DesignKnobVector = {
  layout: { sectionCount: { min: 5, max: 7 }, density: 0.5, whitespaceDrama: 0.45, asymmetry: 0.35, rhythmVariation: 0.45, fullBleedRatio: 0.2, overlapDepth: 0.1, gridStrictness: 0.6, sectionHeightVariance: 0.45 },
  typography: { scaleContrast: 0.5, editorialSerifBias: 0.2, weightVariance: 0.35, letterSpacingIntent: "neutral", casing: "mixed", bodyTone: "neutral" },
  color: { mode: "light", temperature: 0.5, saturation: 0.4, contrast: 0.65, accentRestraint: 0.55, palette: [] },
  imagery: { dominance: 0.35, cropDrama: 0.3, subjectSpecificity: 0.45, treatment: "raw", role: "supporting" },
  components: { radius: 0.25, shadowDepth: 0.15, borderPresence: 0.45, iconUsage: 0.35, ctaProminence: 0.6, cardGridLikelihood: 0.55 },
  content: { copyDensity: 0.45, tone: "clear", conversionPressure: 0.45, narrativeDepth: 0.35 },
};

export const DESIGN_KNOB_PRESETS: Record<string, DesignKnobVector> = {
  "editorial-brand": mergeKnobs(baseKnobs, {
    layout: { density: 0.7, whitespaceDrama: 0.8, asymmetry: 0.75, rhythmVariation: 0.85, fullBleedRatio: 0.45, gridStrictness: 0.35, sectionHeightVariance: 0.8 },
    typography: { scaleContrast: 0.85, editorialSerifBias: 0.75, weightVariance: 0.55, bodyTone: "literary" },
    imagery: { dominance: 0.8, cropDrama: 0.7, role: "hero" },
    components: { ctaProminence: 0.25, cardGridLikelihood: 0.05, iconUsage: 0.05 },
    content: { conversionPressure: 0.15, narrativeDepth: 0.85, tone: "editorial" },
  }),
  "creative-portfolio": mergeKnobs(baseKnobs, {
    layout: { sectionCount: { min: 4, max: 6 }, whitespaceDrama: 0.9, asymmetry: 0.8, rhythmVariation: 0.75, fullBleedRatio: 0.4 },
    typography: { scaleContrast: 0.9, weightVariance: 0.5 },
    imagery: { dominance: 0.75, role: "documentary" },
    components: { ctaProminence: 0.2, cardGridLikelihood: 0.05, shadowDepth: 0.05 },
    content: { conversionPressure: 0.1, narrativeDepth: 0.7, tone: "personal and specific" },
  }),
  "minimal-tech": mergeKnobs(baseKnobs, {
    layout: { sectionCount: { min: 3, max: 5 }, density: 0.55, whitespaceDrama: 0.75, gridStrictness: 0.85 },
    typography: { scaleContrast: 0.6, bodyTone: "technical" },
    components: { ctaProminence: 0.55, cardGridLikelihood: 0.35, iconUsage: 0.2 },
  }),
  "premium-saas": mergeKnobs(baseKnobs, {
    layout: { density: 0.45, whitespaceDrama: 0.45, gridStrictness: 0.9, rhythmVariation: 0.4 },
    imagery: { dominance: 0.45, role: "product" },
    components: { ctaProminence: 0.8, cardGridLikelihood: 0.8, iconUsage: 0.65 },
    content: { conversionPressure: 0.75, narrativeDepth: 0.25 },
  }),
};

export function deriveDesignKnobs(args: {
  tasteProfile?: TasteProfile | null;
  intentProfile?: IntentProfile | null;
  fidelityMode?: FidelityMode;
  compositionData?: Array<{
    analysis: CompositionAnalysis;
    weight: "primary" | "default" | "muted";
    referenceIndex: number;
  }>;
  compositionBlueprint?: string;
}): DesignKnobVector {
  const taste = args.tasteProfile;
  const intent = args.intentProfile;
  const preset = DESIGN_KNOB_PRESETS[taste?.archetypeMatch ?? ""] ?? DESIGN_KNOB_PRESETS["premium-saas"] ?? baseKnobs;
  let knobs = mergeKnobs(baseKnobs, preset);

  if (taste) {
    knobs = mergeKnobs(knobs, {
      layout: {
        density: taste.layoutBias.density === "spacious" ? 0.75 : taste.layoutBias.density === "dense" ? 0.2 : 0.5,
        whitespaceDrama: taste.layoutBias.whitespaceIntent === "dramatic" ? 0.9 : knobs.layout.whitespaceDrama,
        asymmetry: ["asymmetric", "editorial"].includes(taste.layoutBias.rhythm) ? 0.8 : knobs.layout.asymmetry,
        fullBleedRatio: taste.imageTreatment.sizing === "full-bleed" ? 0.55 : knobs.layout.fullBleedRatio,
      },
      color: {
        mode: taste.colorBehavior.mode,
        palette: [
          taste.colorBehavior.suggestedColors.background,
          taste.colorBehavior.suggestedColors.surface,
          taste.colorBehavior.suggestedColors.text,
          taste.colorBehavior.suggestedColors.accent,
          taste.colorBehavior.suggestedColors.secondary,
        ].filter((color): color is string => Boolean(color)),
        temperature: taste.colorBehavior.temperature === "warm" ? 0.8 : taste.colorBehavior.temperature === "cool" ? 0.2 : 0.5,
        saturation: taste.colorBehavior.saturation === "vivid" ? 0.85 : taste.colorBehavior.saturation === "desaturated" ? 0.15 : 0.45,
      },
      typography: {
        scaleContrast: taste.typographyTraits.contrast === "extreme" ? 0.95 : taste.typographyTraits.contrast === "high" ? 0.75 : knobs.typography.scaleContrast,
        bodyTone: taste.typographyTraits.bodyTone,
        casing: taste.typographyTraits.casePreference.includes("uppercase") ? "uppercase" : "mixed",
      },
      imagery: {
        treatment: taste.imageTreatment.treatment,
        role: taste.imageTreatment.style === "product" ? "product" : taste.imageTreatment.style === "documentary" ? "documentary" : knobs.imagery.role,
      },
      components: {
        radius: taste.ctaTone.shape === "pill" ? 1 : taste.ctaTone.shape === "sharp" ? 0 : 0.3,
        ctaProminence: taste.ctaTone.hierarchy === "text-link-preferred" ? 0.2 : taste.ctaTone.hierarchy === "primary-dominant" ? 0.85 : knobs.components.ctaProminence,
      },
    });
  }

  if (intent) {
    const lowChrome = intent.businessGoal === "portfolio" || intent.businessGoal === "editorial";
    knobs = mergeKnobs(knobs, {
      components: {
        cardGridLikelihood: lowChrome ? 0.05 : knobs.components.cardGridLikelihood,
        ctaProminence: lowChrome ? Math.min(knobs.components.ctaProminence, 0.3) : knobs.components.ctaProminence,
      },
      content: {
        tone: intent.copyTone,
        conversionPressure: intent.businessGoal === "conversion" || intent.businessGoal === "launch" ? 0.8 : knobs.content.conversionPressure,
        narrativeDepth: intent.businessGoal === "editorial" ? 0.9 : knobs.content.narrativeDepth,
      },
    });
  }

  knobs = applyCompositionSignal(knobs, {
    compositionData: args.compositionData ?? [],
    compositionBlueprint: args.compositionBlueprint,
    intentProfile: intent,
  });

  if (args.fidelityMode === "push") {
    knobs.layout.asymmetry = clamp01(knobs.layout.asymmetry + 0.1);
    knobs.typography.scaleContrast = clamp01(knobs.typography.scaleContrast + 0.1);
  }
  return knobs;
}

function applyCompositionSignal(knobs: DesignKnobVector, args: {
  compositionData: Array<{
    analysis: CompositionAnalysis;
    weight: "primary" | "default" | "muted";
    referenceIndex: number;
  }>;
  compositionBlueprint?: string;
  intentProfile?: IntentProfile | null;
}): DesignKnobVector {
  let next = knobs;
  const roleByReference = new Map<string, { role: string; weight: "primary" | "default" | "muted" }>();
  for (const role of args.intentProfile?.referenceRoles ?? []) {
    roleByReference.set(role.referenceId, { role: role.role, weight: role.weight });
  }

  let totalWeight = 0;
  let asymmetry = 0;
  let whitespaceDrama = 0;
  let fullBleedRatio = 0;
  let imageDominance = 0;
  let cropDrama = 0;
  let scaleContrast = 0;
  let cardGridLikelihood = 0;
  let radius = 0;
  let shadowDepth = 0;
  let ctaProminence = 0;

  for (const item of args.compositionData) {
    const refId = `reference-${item.referenceIndex + 1}`;
    const roleSignal = roleByReference.get(refId);
    const sourceWeight = roleSignal?.weight ?? item.weight;
    if (sourceWeight === "muted" || item.weight === "muted") continue;

    const role = roleSignal?.role;
    const roleMultiplier =
      role === "layout" || role === "imagery" || role === "typography" || role === "component"
        ? 1.25
        : role === "palette" || role === "mood"
          ? 0.75
          : 1;
    const weight = (sourceWeight === "primary" ? 3 : 1) * roleMultiplier;
    const analysis = item.analysis;
    totalWeight += weight;

    asymmetry += weight * (analysis.balance === "asymmetric" || analysis.balance === "dynamic" ? 0.85 : 0.25);
    whitespaceDrama += weight * (analysis.density === "sparse" ? 0.85 : analysis.density === "balanced" ? 0.5 : 0.2);
    scaleContrast += weight * (analysis.headingToBodyRatio === "dramatic" ? 0.85 : analysis.headingToBodyRatio === "moderate" ? 0.55 : 0.25);

    const fullBleed = analysis.editorial?.imageCropping === "full-bleed" ||
      analysis.editorial?.imageCropping === "bled-off-edge" ||
      analysis.specialLayouts?.some((layout) => layout.pattern === "full-bleed-type") ||
      analysis.typographicDensity === "image-dominant";
    fullBleedRatio += weight * (fullBleed ? 0.65 : 0.2);
    imageDominance += weight * (analysis.referenceType === "photograph" || analysis.referenceType === "editorial" || analysis.typographicDensity === "image-dominant" ? 0.8 : 0.35);
    cropDrama += weight * (analysis.photograph?.focalPoint.strength === "strong" || fullBleed ? 0.75 : 0.35);

    const component = analysis.screenshot?.componentSignature;
    if (component) {
      cardGridLikelihood += weight * (analysis.screenshot?.gridProportions.some((grid) => grid.includes("3")) ? 0.75 : 0.35);
      radius += weight * (component.cornerStyle === "pill" ? 1 : component.cornerStyle === "rounded" ? 0.65 : component.cornerStyle === "subtle-radius" ? 0.25 : 0);
      shadowDepth += weight * (component.shadowDepth === "dramatic" ? 0.9 : component.shadowDepth === "medium" ? 0.55 : component.shadowDepth === "subtle" ? 0.2 : 0);
      ctaProminence += weight * (component.buttonStyle === "filled" ? 0.75 : component.buttonStyle === "text-link" ? 0.2 : 0.45);
    } else {
      cardGridLikelihood += weight * 0.15;
      radius += weight * knobs.components.radius;
      shadowDepth += weight * knobs.components.shadowDepth;
      ctaProminence += weight * knobs.components.ctaProminence;
    }
  }

  if (totalWeight > 0) {
    next = mergeKnobs(next, {
      layout: {
        asymmetry: blend(next.layout.asymmetry, asymmetry / totalWeight, 0.6),
        whitespaceDrama: blend(next.layout.whitespaceDrama, whitespaceDrama / totalWeight, 0.35),
        fullBleedRatio: blend(next.layout.fullBleedRatio, fullBleedRatio / totalWeight, 0.6),
        rhythmVariation: blend(next.layout.rhythmVariation, asymmetry / totalWeight, 0.3),
      },
      typography: {
        scaleContrast: blend(next.typography.scaleContrast, scaleContrast / totalWeight, 0.35),
      },
      imagery: {
        dominance: blend(next.imagery.dominance, imageDominance / totalWeight, 0.45),
        cropDrama: blend(next.imagery.cropDrama, cropDrama / totalWeight, 0.4),
      },
      components: {
        cardGridLikelihood: blend(next.components.cardGridLikelihood, cardGridLikelihood / totalWeight, 0.35),
        radius: blend(next.components.radius, radius / totalWeight, 0.25),
        shadowDepth: blend(next.components.shadowDepth, shadowDepth / totalWeight, 0.25),
        ctaProminence: blend(next.components.ctaProminence, ctaProminence / totalWeight, 0.25),
      },
    });
  }

  const blueprint = args.compositionBlueprint?.toLowerCase() ?? "";
  if (blueprint) {
    next = mergeKnobs(next, {
      layout: {
        asymmetry: blueprint.includes("asymmetric") ? clamp01(next.layout.asymmetry + 0.08) : next.layout.asymmetry,
        fullBleedRatio: blueprint.includes("full-bleed") ? clamp01(next.layout.fullBleedRatio + 0.08) : next.layout.fullBleedRatio,
        whitespaceDrama: blueprint.includes("dramatic") || blueprint.includes("whitespace") ? clamp01(next.layout.whitespaceDrama + 0.06) : next.layout.whitespaceDrama,
      },
      imagery: {
        dominance: blueprint.includes("photograph") || blueprint.includes("image-dominant") ? clamp01(next.imagery.dominance + 0.08) : next.imagery.dominance,
      },
    });
  }

  return next;
}

export function serializeDesignKnobsForPrompt(knobs: DesignKnobVector): string {
  return [
    "## Design Knob Vector",
    `- section count: ${knobs.layout.sectionCount.min}-${knobs.layout.sectionCount.max}`,
    `- density ${n(knobs.layout.density)}, whitespace drama ${n(knobs.layout.whitespaceDrama)}, asymmetry ${n(knobs.layout.asymmetry)}, rhythm variation ${n(knobs.layout.rhythmVariation)}`,
    `- full-bleed ratio ${n(knobs.layout.fullBleedRatio)}, grid strictness ${n(knobs.layout.gridStrictness)}, height variance ${n(knobs.layout.sectionHeightVariance)}`,
    `- type scale contrast ${n(knobs.typography.scaleContrast)}, serif bias ${n(knobs.typography.editorialSerifBias)}, casing ${knobs.typography.casing}, body tone ${knobs.typography.bodyTone}`,
    `- color mode ${knobs.color.mode}, contrast ${n(knobs.color.contrast)}, accent restraint ${n(knobs.color.accentRestraint)}, palette ${knobs.color.palette.join(", ") || "from tokens"}`,
    `- imagery dominance ${n(knobs.imagery.dominance)}, crop drama ${n(knobs.imagery.cropDrama)}, role ${knobs.imagery.role}, treatment ${knobs.imagery.treatment}`,
    `- radius ${n(knobs.components.radius)}, shadow ${n(knobs.components.shadowDepth)}, CTA prominence ${n(knobs.components.ctaProminence)}, card-grid likelihood ${n(knobs.components.cardGridLikelihood)}`,
    `- copy density ${n(knobs.content.copyDensity)}, conversion pressure ${n(knobs.content.conversionPressure)}, narrative depth ${n(knobs.content.narrativeDepth)}, tone ${knobs.content.tone}`,
    "",
    "Use these as continuous targets. Do not treat archetype examples as fixed templates.",
  ].join("\n");
}

function mergeKnobs(base: DesignKnobVector, patch: DeepPartial<DesignKnobVector>): DesignKnobVector {
  return {
    layout: {
      ...base.layout,
      ...patch.layout,
      sectionCount: { ...base.layout.sectionCount, ...patch.layout?.sectionCount },
    },
    typography: { ...base.typography, ...patch.typography },
    color: {
      ...base.color,
      ...patch.color,
      palette: patch.color?.palette?.filter((color): color is string => typeof color === "string") ?? base.color.palette,
    },
    imagery: { ...base.imagery, ...patch.imagery },
    components: { ...base.components, ...patch.components },
    content: { ...base.content, ...patch.content },
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function blend(current: number, signal: number, amount: number): number {
  return clamp01(current * (1 - amount) + signal * amount);
}

function n(value: number): string {
  return value.toFixed(2);
}
