export type ColorPalette = {
  dominant: string[];
  accents: string[];
  neutrals: string[];
};

export type TypographyPattern = {
  category: "serif" | "sans-serif" | "mono" | "display" | "mixed";
  weights: string[];
  hierarchy: string;
};

export type VibeClassification = {
  density: "minimal" | "balanced" | "maximal";
  tone: "playful" | "neutral" | "serious";
  energy: "calm" | "moderate" | "energetic";
};

export type ImageAnalysis = {
  colors: ColorPalette;
  typography: TypographyPattern;
  spacing: {
    density: "tight" | "comfortable" | "spacious";
    rhythm: string;
  };
  vibe: VibeClassification;
  summary: string;
};

export type ReferenceSet = {
  id: string;
  name: string;
  images: ReferenceImage[];
  analysis: ImageAnalysis | null;
  createdAt: string;
};

export type ReferenceImage = {
  id: string;
  file?: File;
  url: string;
  thumbnail: string;
  name: string;
};

export const ANALYSIS_PROMPT = `Analyze this collection of design reference images as a visual design system consultant.

Extract the following with precision:

1. **Color Palette**
   - dominant: The 2-3 most prominent colors (hex values)
   - accents: 2-3 accent/highlight colors (hex)
   - neutrals: 2-3 neutral/background colors (hex)

2. **Typography Patterns**
   - category: serif, sans-serif, mono, display, or mixed
   - weights: observed font weights (light, regular, medium, bold, etc.)
   - hierarchy: describe the typographic hierarchy (e.g. "Large bold headlines with thin body text")

3. **Spacing & Layout**
   - density: tight, comfortable, or spacious
   - rhythm: describe the spacing rhythm (e.g. "8px base unit, generous whitespace between sections")

4. **Vibe Classification**
   - density: minimal, balanced, or maximal
   - tone: playful, neutral, or serious
   - energy: calm, moderate, or energetic

5. **Summary**: A 2-sentence description of the overall design direction.

Respond ONLY with valid JSON matching this exact schema:
{
  "colors": {
    "dominant": ["#hex1", "#hex2"],
    "accents": ["#hex1", "#hex2"],
    "neutrals": ["#hex1", "#hex2"]
  },
  "typography": {
    "category": "sans-serif",
    "weights": ["regular", "bold"],
    "hierarchy": "description"
  },
  "spacing": {
    "density": "comfortable",
    "rhythm": "description"
  },
  "vibe": {
    "density": "minimal",
    "tone": "serious",
    "energy": "calm"
  },
  "summary": "description"
}`;
