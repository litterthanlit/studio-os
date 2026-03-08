export type TasteProfile = {
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
