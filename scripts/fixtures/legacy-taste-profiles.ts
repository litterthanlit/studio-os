// Legacy TasteProfiles (no typeScaleSource, no layers) for proof:taste-compile.
// Golden prompt text in legacy-taste-prompts.json was produced by the
// directive compiler and prompt builder as they were before the layered
// compile (1.5); the proof asserts they still produce it byte-for-byte.
/* eslint-disable @typescript-eslint/no-explicit-any */

const editorial: any = {
  summary: "Quiet editorial serif with warm neutrals",
  adjectives: ["editorial", "restrained", "warm"],
  archetypeMatch: "editorial-brand",
  archetypeConfidence: 0.82,
  layoutBias: { density: "spacious", rhythm: "asymmetric", heroStyle: "full-bleed", sectionFlow: "editorial-grid", gridBehavior: "editorial", whitespaceIntent: "dramatic" },
  typographyTraits: { scale: "dramatic", headingTone: "editorial", bodyTone: "literary", contrast: "high", casePreference: "mixed", recommendedPairings: ["Bespoke Serif", "Geist"] },
  colorBehavior: { mode: "light", palette: "restrained", accentStrategy: "no-accent", saturation: "desaturated", temperature: "warm", suggestedColors: { background: "#FAF9F6", surface: "#F1EEE8", text: "#1A1A1A", accent: "#8A6F4D" } },
  imageTreatment: { style: "editorial", sizing: "full-bleed", treatment: "raw", cornerRadius: "none", borders: false, shadow: "none", aspectPreference: "mixed" },
  ctaTone: { style: "editorial", shape: "sharp", hierarchy: "text-link-preferred" },
  avoid: ["use gradients", "use drop shadows"],
  confidence: 0.8,
  referenceCount: 3,
  dominantReferenceType: "photography",
  warnings: [],
  spacingSystem: "8px base",
  typeScale: { display: 88, heading: 48, body: 18 },
  measuredDensity: "sparse",
};

const saasOverrides: any = {
  ...editorial,
  summary: "Crisp product SaaS",
  adjectives: ["precise", "technical"],
  archetypeMatch: "premium-saas",
  archetypeConfidence: 0.64,
  layoutBias: { density: "balanced", rhythm: "uniform", heroStyle: "split", sectionFlow: "stacked", gridBehavior: "strict", whitespaceIntent: "structural" },
  typographyTraits: { scale: "moderate", headingTone: "geometric", bodyTone: "technical", contrast: "medium", casePreference: "mixed", recommendedPairings: ["Geist", "Geist"] },
  colorBehavior: { mode: "dark", palette: "neutral-plus-accent", accentStrategy: "single-pop", saturation: "moderate", temperature: "cool", suggestedColors: { background: "#0B0C0E", surface: "#15171A", text: "#F2F2F2", accent: "#4B57DB", secondary: "#2A2D33" } },
  imageTreatment: { style: "product", sizing: "contained", treatment: "raw", cornerRadius: "subtle", borders: true, shadow: "subtle", aspectPreference: "landscape" },
  ctaTone: { style: "direct", shape: "rounded", hierarchy: "primary-dominant" },
  avoid: [],
  dominantReferenceType: "screenshot",
  typeScale: undefined,
  spacingSystem: undefined,
  userOverrides: { headingFont: "Inter Display", palette: ["#0B0C0E", "#4B57DB"], density: "dense", addToAvoid: ["use stock photos"], knobs: { components: { radius: 0.1 } } },
};

const minimal: any = {
  ...editorial,
  summary: "Minimal gallery",
  adjectives: ["minimal", "clean"],
  archetypeMatch: "gallery-portfolio",
  archetypeConfidence: 0.4,
  typeScale: undefined,
  avoid: [],
};

export const LEGACY_PROFILES: Record<string, any> = { editorial, saasOverrides, minimal };
