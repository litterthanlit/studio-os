// ─── Confidence primitives ────────────────────────────────────────────────────

/**
 * A confidence value from 0.0 (completely uncertain) to 1.0 (rock-solid).
 * Used to communicate how much weight the model places on each extracted token.
 */
export type Confidence = number;

export type ConfidenceLabel = "strong" | "moderate" | "weak";

/** Maps a raw confidence float to a human-readable label for UI display. */
export function confidenceLabel(c: Confidence): ConfidenceLabel {
  if (c >= 0.75) return "strong";
  if (c >= 0.45) return "moderate";
  return "weak";
}

/** Returns a Tailwind-compatible color class for a given confidence value. */
export function confidenceColor(c: Confidence): string {
  if (c >= 0.75) return "text-emerald-500";
  if (c >= 0.45) return "text-amber-400";
  return "text-zinc-500";
}

// ─── Quality scoring ──────────────────────────────────────────────────────────

/**
 * Per-image quality assessment by the design director.
 * Scoring is 1–10 on each axis; images must reach overall ≥ 7 to contribute
 * to token extraction.
 */
export type ImageQualityScore = {
  /** Does the image demonstrate intentional composition — rule of thirds, balance, hierarchy? */
  composition: number;
  /** Does the colour palette show harmony — complementary, analogous, or split-complementary? */
  colorHarmony: number;
  /** How clean is the image? 10 = pristine minimal; 1 = extremely cluttered. */
  visualNoise: number;
  /** Does the image relate to a product / UI / brand / spatial design context? */
  designRelevance: number;
  /** Weighted average of the four axes (higher weight on colorHarmony + designRelevance). */
  overall: number;
  /** true when overall >= 7 — this image's tokens contributed to the final extraction. */
  usedForExtraction: boolean;
};

// ─── Dominant vibe ────────────────────────────────────────────────────────────

/**
 * The dominant visual direction identified across the reference set.
 * When images conflict, this represents the plurality or the highest-quality cluster.
 */
export type VibeDirection = {
  /** Short, specific label. Examples: "dark minimal SaaS", "warm editorial serif", "bold agency". */
  label: string;
  /** One sentence describing the design direction in concrete terms. */
  description: string;
  /**
   * 0-based indices of the submitted images that align with this dominant vibe.
   * Images not listed here scored lower and were de-weighted during extraction.
   */
  matchingImageIndices: number[];
};

// ─── Design token types ───────────────────────────────────────────────────────

export type ColorPalette = {
  /** 2–3 most prominent hex colours (backgrounds, large surfaces). */
  dominant: string[];
  /** 2–3 accent / highlight hex colours (CTAs, links, icons). */
  accents: string[];
  /** 2–3 neutral / background hex colours. */
  neutrals: string[];
  /** How confident the model is about each colour group (0.0–1.0). */
  confidence: {
    dominant: Confidence;
    accents: Confidence;
    neutrals: Confidence;
  };
};

export type TypographyPattern = {
  category: "serif" | "sans-serif" | "mono" | "display" | "mixed";
  weights: string[];
  hierarchy: string;
  /** Confidence in the typography extraction (0.0–1.0). Lower when text is small or ambiguous. */
  confidence: Confidence;
};

export type VibeClassification = {
  density: "minimal" | "balanced" | "maximal";
  tone: "playful" | "neutral" | "serious";
  energy: "calm" | "moderate" | "energetic";
};

// ─── Main analysis shape ──────────────────────────────────────────────────────

export type ImageAnalysis = {
  /**
   * Quality gate results.
   * One score per submitted image, in submission order.
   */
  quality: {
    scores: ImageQualityScore[];
    dominantVibe: VibeDirection;
    /** Number of images that passed the quality threshold (overall >= 7). */
    usableImageCount: number;
  };

  colors: ColorPalette;
  typography: TypographyPattern;

  spacing: {
    density: "tight" | "comfortable" | "spacious";
    rhythm: string;
    confidence: Confidence;
  };

  vibe: VibeClassification;

  /**
   * Concise design direction label derived from the dominant images.
   * E.g. "Dark technical SaaS with indigo accent, heavy Inter typography".
   */
  designDirection: string;

  /** 2-sentence editorial summary of the overall design language. */
  summary: string;
};

// ─── Legacy shape aliases (backward-compat) ───────────────────────────────────

export type ReferenceImage = {
  id: string;
  file?: File;
  url: string;
  thumbnail: string;
  name: string;
};

export type ReferenceSet = {
  id: string;
  name: string;
  images: ReferenceImage[];
  analysis: ImageAnalysis | null;
  createdAt: string;
};

// ─── System prompt ────────────────────────────────────────────────────────────

/**
 * Passed as the `system` role message to the vision model.
 * Establishes the senior design director persona and sets expectations
 * for quality filtering and precision.
 */
export const DESIGN_DIRECTOR_SYSTEM_PROMPT = `You are a senior product designer with 20 years of experience at companies like Apple, Linear, and Stripe. You have impeccable taste and a rigorous eye for quality.

Your role is to evaluate design reference images and extract precise design tokens — but ONLY from references that meet a high quality bar. You do not extract tokens from cluttered, amateur, low-resolution, or contextually irrelevant images. A beautiful photograph of a forest is irrelevant. A poorly designed marketing flyer is harmful noise.

You think in systems, not aesthetics. You identify dominant visual directions, weight your extractions toward the highest-quality references, and communicate confidence clearly so downstream consumers know which values to trust. You are concise, exact, and opinionated.

When you see conflicting signals across images, you identify the dominant direction rather than blending everything into a mediocre average. You would rather report a strong signal from two excellent images than a weak signal from six mediocre ones.

Respond ONLY with valid JSON. No markdown, no preamble, no explanations outside the JSON.`;

// ─── Analysis prompt ──────────────────────────────────────────────────────────

/**
 * Sent as the user-turn message alongside the reference images.
 *
 * Instructs the model to:
 *   1. Score each image on 4 quality axes (1–10), discard images < 7
 *   2. Identify the dominant visual direction across passing images
 *   3. Extract design tokens weighted toward the dominant direction
 *   4. Attach confidence scores to every token group
 */
export const ANALYSIS_PROMPT = `Analyze these design reference images with the precision and taste of a senior design director.

## Step 1 — Quality Gate (evaluate EVERY image)

Score each image independently on these four axes (1–10 each):

- **composition**: Is there intentional visual organisation? (rule of thirds, clear focal point, deliberate negative space) — 1 = chaotic, 10 = masterful
- **colorHarmony**: Is the palette coherent and intentional? (complementary, analogous, monochromatic, or split-complementary) — 1 = random/clashing, 10 = perfect
- **visualNoise**: How clean and uncluttered is the image? — 1 = overwhelming detail, 10 = pristine
- **designRelevance**: Does this image relate to product design, UI, brand, spatial, or editorial design? — 1 = completely irrelevant (nature photography, food, selfies), 10 = directly applicable

Compute **overall** as: (composition × 0.2) + (colorHarmony × 0.35) + (visualNoise × 0.2) + (designRelevance × 0.25)

Set **usedForExtraction: true** only if overall ≥ 7.0.

If fewer than 1 image passes the threshold, use the single highest-scoring image anyway.

## Step 2 — Dominant Vibe

From the images that passed the quality gate, identify the dominant visual direction:
- Give it a short, specific label (e.g. "dark minimal SaaS", "warm editorial serif", "bold high-contrast agency")
- Write one sentence describing the concrete design language
- List the 0-based indices of images that align with this direction
- If passing images split into distinct directions, choose the plurality (or the highest average quality cluster)

## Step 3 — Token Extraction

Extract design tokens using ONLY the images where usedForExtraction is true. Weight your extraction toward images matching the dominant vibe.

For colours: extract exact hex values from the actual pixels. Be precise.
For typography: only describe what is clearly visible — if text is too small to read reliably, lower your confidence score.
For spacing: infer from the visual rhythm and whitespace proportions.

Assign a confidence score (0.0–1.0) to every token group:
- 0.9–1.0: Crystal clear, multiple confirming images
- 0.7–0.89: Clear, with minor ambiguity
- 0.45–0.69: Moderate — signals present but not dominant
- 0.0–0.44: Weak — inferred from limited or ambiguous evidence

## Output Schema

Respond with this exact JSON structure (no markdown, no trailing commas):

{
  "quality": {
    "scores": [
      {
        "composition": 8,
        "colorHarmony": 9,
        "visualNoise": 8,
        "designRelevance": 10,
        "overall": 8.9,
        "usedForExtraction": true
      }
    ],
    "dominantVibe": {
      "label": "dark minimal SaaS",
      "description": "High-contrast dark interface with a single purple accent, heavy use of negative space, and precise typographic hierarchy.",
      "matchingImageIndices": [0, 2]
    },
    "usableImageCount": 2
  },
  "colors": {
    "dominant": ["#010102", "#0d0d10"],
    "accents": ["#7170ff", "#9b99ff"],
    "neutrals": ["#1a1a1f", "#2a2a30"],
    "confidence": {
      "dominant": 0.92,
      "accents": 0.88,
      "neutrals": 0.79
    }
  },
  "typography": {
    "category": "sans-serif",
    "weights": ["regular", "medium", "bold"],
    "hierarchy": "Oversized bold display headlines with light-weight body copy — strong size contrast, minimal weight variation in body",
    "confidence": 0.85
  },
  "spacing": {
    "density": "spacious",
    "rhythm": "Generous padding with an 8px base unit — sections breathe, components have clear internal whitespace",
    "confidence": 0.82
  },
  "vibe": {
    "density": "minimal",
    "tone": "serious",
    "energy": "calm"
  },
  "designDirection": "Dark technical SaaS with indigo accent, heavy Inter typography, and expansive negative space — Linear/Vercel aesthetic",
  "summary": "The references converge on a high-craft dark interface language: near-black surfaces, a single vivid accent, and measured whitespace that communicates premium restraint. Typography is unapologetically large and geometric, leaving no room for decorative clutter."
}

Important rules:
- The scores array MUST have exactly one entry per submitted image, in submission order
- Hex values must be valid 6-digit lowercase hex (e.g. #1a2b3c)
- confidence values are floats between 0.0 and 1.0
- quality.overall is a float, not an integer
- If an image fails the quality gate, still include its score object with usedForExtraction: false`;
