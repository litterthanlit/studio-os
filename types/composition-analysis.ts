export type ReferenceType = "screenshot" | "photograph" | "editorial" | "poster" | "mixed";

export type SpecialLayoutPattern =
  | "full-bleed-type"
  | "overlapping-type-image"
  | "extreme-whitespace"
  | "stacked-display"
  | "asymmetric-blocks"
  | "type-as-texture";

export type CompositionAnalysis = {
  // Classification
  referenceType: ReferenceType;
  secondaryTraits?: ReferenceType[];
  referenceConfidence: "high" | "medium" | "low";
  era: "retro" | "y2k" | "contemporary" | "timeless";
  analyzedAt: string;

  // Universal fields
  balance: "symmetric" | "asymmetric" | "dynamic";
  density: "sparse" | "balanced" | "rich";
  tension: "relaxed" | "moderate" | "tense";
  keyCompositionalMove: string;
  spacingSystem: "4px-grid" | "8px-grid" | "organic" | "golden-ratio" | "chaotic-intentional";

  // Typography (all types)
  typographicDensity: "text-heavy" | "balanced" | "image-dominant";
  hierarchyClarity: "obvious" | "subtle" | "flat";
  displayTypePlacement: "edge-anchored" | "centered" | "overlapping-imagery" | "isolated-whitespace";
  lineHeightCharacter: "tight-editorial" | "balanced-readable" | "loose-luxe";
  letterSpacingIntent: "tracked-uppercase" | "tight-display" | "neutral";
  headingToBodyRatio: "dramatic" | "moderate" | "subtle";

  // Special layout flags
  specialLayouts?: Array<{
    pattern: SpecialLayoutPattern;
    details: string;
  }>;

  // Type-specific (only one populated based on referenceType)
  screenshot?: ScreenshotComposition;
  photograph?: PhotographComposition;
  editorial?: EditorialComposition;
};

export type ScreenshotComposition = {
  sectionInventory: Array<{
    type: string;
    visualHierarchy: "text-dominant" | "image-dominant" | "balanced";
    heightCharacter: "tall" | "medium" | "compact";
  }>;
  gridProportions: string[];
  navigationStyle: "top-bar" | "sticky" | "minimal" | "hidden";
  typeDensityZone: "hero-heavy" | "distributed" | "footer-loaded";
  textBlockWidth: "narrow-column" | "wide-measure" | "full-width";
  componentSignature: {
    cornerStyle: "sharp" | "subtle-radius" | "rounded" | "pill";
    shadowDepth: "none" | "subtle" | "medium" | "dramatic";
    borderUsage: "none" | "subtle" | "structural";
    buttonStyle: "filled" | "outlined" | "ghost" | "text-link";
  };
};

export type PhotographComposition = {
  subjectArchetype: "portrait" | "landscape" | "still-life" | "architectural" | "fashion" | "abstract";
  focalPoint: {
    x: number;
    y: number;
    strength: "strong" | "diffuse";
  };
  compositionType: "centered" | "asymmetric" | "diagonal" | "layered" | "rule-of-thirds";
  depthLayers: "flat" | "shallow" | "deep";
  colorStory: string;
  lightDirection: "front" | "side" | "back" | "ambient" | "dramatic-contrast";
  mood: string;
};

export type EditorialComposition = {
  textImageRelationship: "overlay" | "adjacent" | "integrated" | "separated";
  typographyPlacement: "above-image" | "below-image" | "over-image" | "beside-image";
  whiteSpaceStrategy: "breathing" | "tension" | "dramatic";
  imageCropping: "full-bleed" | "contained" | "bled-off-edge";
  pacing: "even" | "building" | "contrasting";
  baselineGridAdherence: "strict" | "optical" | "free";
  typeToMargin: "tight-tension" | "generous-breathing" | "edge-anchored";
  captionTreatment?: "small-below" | "side-aligned" | "integrated" | "none";
  pullQuoteScale?: "subtle" | "moderate" | "dramatic";
  paragraphSpacing: "indents" | "line-breaks" | "extra-leading";
};
