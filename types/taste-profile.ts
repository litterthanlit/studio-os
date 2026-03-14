export type TasteProfile = {
  // Core identity
  summary: string;
  adjectives: string[];
  archetypeMatch: string;
  archetypeConfidence: number;
  secondaryArchetype?: string;

  // Layout
  layoutBias: {
    density: "spacious" | "balanced" | "dense";
    rhythm: "uniform" | "alternating" | "progressive" | "asymmetric";
    heroStyle: "full-bleed" | "contained" | "split" | "text-dominant" | "media-dominant";
    sectionFlow: "stacked" | "overlapping" | "interlocking" | "editorial-grid";
    gridBehavior: "strict" | "fluid" | "broken" | "editorial";
    whitespaceIntent: "breathing" | "structural" | "dramatic" | "minimal";
  };

  // Typography
  typographyTraits: {
    scale: "compressed" | "moderate" | "expanded" | "dramatic";
    headingTone: "display" | "editorial" | "technical" | "humanist" | "geometric";
    bodyTone: "neutral" | "warm" | "technical" | "literary";
    contrast: "low" | "medium" | "high" | "extreme";
    casePreference: "mixed" | "uppercase-headings" | "all-uppercase" | "all-lowercase";
    recommendedPairings: string[];
  };

  // Color
  colorBehavior: {
    mode: "light" | "dark" | "mixed" | "adaptive";
    palette: "monochromatic" | "analogous" | "complementary" | "neutral-plus-accent" | "restrained";
    accentStrategy: "single-pop" | "gradient-subtle" | "gradient-bold" | "multi-accent" | "no-accent";
    saturation: "desaturated" | "muted" | "moderate" | "vivid";
    temperature: "cool" | "neutral" | "warm";
    suggestedColors: {
      background: string;
      surface: string;
      text: string;
      accent: string;
      secondary?: string;
    };
  };

  // Image treatment
  imageTreatment: {
    style: "editorial" | "product" | "atmospheric" | "abstract" | "documentary" | "minimal";
    sizing: "full-bleed" | "contained" | "mixed" | "thumbnail-grid";
    treatment: "raw" | "filtered" | "duotone" | "high-contrast" | "desaturated";
    cornerRadius: "none" | "subtle" | "rounded" | "pill";
    borders: boolean;
    shadow: "none" | "subtle" | "medium" | "dramatic";
    aspectPreference: "landscape" | "portrait" | "square" | "mixed";
  };

  // CTA and conversion
  ctaTone: {
    style: "bold" | "understated" | "editorial" | "technical" | "playful";
    shape: "sharp" | "subtle-radius" | "rounded" | "pill";
    hierarchy: "primary-dominant" | "balanced" | "text-link-preferred";
  };

  // Constraints
  avoid: string[];

  // Metadata
  confidence: number;
  referenceCount: number;
  dominantReferenceType: "ui-screenshot" | "photography" | "poster" | "art" | "mixed";
  warnings: string[];
};
