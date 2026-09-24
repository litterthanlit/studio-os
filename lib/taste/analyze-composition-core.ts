import { SONNET_4_6, imageUrlBlock, tracedCompletion } from "@/lib/ai/model-router";
import { logSafe, warnSafe } from "@/lib/security/api-guard";
import type { CompositionAnalysis, ReferenceType } from "@/types/composition-analysis";

type AnalyzeCompositionBody = {
  imageUrl: string;
};

const VALID_REFERENCE_TYPES = new Set<ReferenceType>([
  "screenshot",
  "photograph",
  "editorial",
  "poster",
  "mixed",
]);

// ── System prompt ────────────────────────────────────────────────────────────
export const COMPOSITION_SYSTEM_PROMPT = `You are an expert visual analyst specializing in design composition, art direction, and typographic layout. You analyze reference images to extract structural and compositional data that will inform AI-powered design generation.

You MUST respond with a single JSON object matching the CompositionAnalysis schema. Be precise and specific — your analysis directly controls how designs are generated.

## Classification

First, classify the image as one of:
- "screenshot" — a website, app, or UI screenshot
- "photograph" — a standalone photograph (portrait, landscape, architectural, etc.)
- "editorial" — a magazine spread, book layout, or editorial design with intentional text-image composition
- "poster" — a poster, advertisement, or single-composition typographic design
- "mixed" — dominant type + secondary traits (set secondaryTraits array)

## Universal Fields (ALL types must include)

- referenceType: the classification above
- secondaryTraits: array of secondary type influences (optional, only for mixed)
- referenceConfidence: "high" (pristine, professional) | "medium" (decent quality) | "low" (grainy, cluttered, has cookie banners)
- era: "retro" | "y2k" | "contemporary" | "timeless"
- balance: "symmetric" | "asymmetric" | "dynamic"
- density: "sparse" | "balanced" | "rich"
- tension: "relaxed" | "moderate" | "tense" (distinct from density — sparse can be tense)
- keyCompositionalMove: ONE sentence describing the single most impactful design decision
- spacingSystem: "4px-grid" | "8px-grid" | "organic" | "golden-ratio" | "chaotic-intentional"

## Typography Fields (ALL types)

- typographicDensity: "text-heavy" | "balanced" | "image-dominant"
- hierarchyClarity: "obvious" (clear levels) | "subtle" (nuanced) | "flat" (monotone scale)
- displayTypePlacement: "edge-anchored" | "centered" | "overlapping-imagery" | "isolated-whitespace"
- lineHeightCharacter: "tight-editorial" | "balanced-readable" | "loose-luxe"
- letterSpacingIntent: "tracked-uppercase" | "tight-display" | "neutral"
- headingToBodyRatio: "dramatic" (large scale jump) | "moderate" | "subtle"

## Special Layout Detection

If you detect ANY of these patterns, include a specialLayouts array entry with the pattern name and specific details:
- "full-bleed-type" — extract: edge distances, crop points, optical vs mathematical centering
- "overlapping-type-image" — extract: layer order, transparency, shadow/outline treatment
- "extreme-whitespace" — extract: ratio of text area to total canvas, isolation distance
- "stacked-display" — extract: inter-line negative space, vertical rhythm
- "asymmetric-blocks" — extract: anchor point (left/right/top edge), counterweight element
- "type-as-texture" — extract: repetition pattern, density gradient, legibility intent

## Type-Specific Fields

### For screenshots — include a "screenshot" object:
- sectionInventory: array of { type: string (e.g. "hero", "features", "testimonials", "cta", "footer"), visualHierarchy: "text-dominant"|"image-dominant"|"balanced", heightCharacter: "tall"|"medium"|"compact" }
- gridProportions: CSS grid notation strings, e.g. ["2fr 1fr", "1fr 1fr 1fr"]
- navigationStyle: "top-bar" | "sticky" | "minimal" | "hidden"
- typeDensityZone: "hero-heavy" | "distributed" | "footer-loaded"
- textBlockWidth: "narrow-column" | "wide-measure" | "full-width"
- componentSignature: { cornerStyle: "sharp"|"subtle-radius"|"rounded"|"pill", shadowDepth: "none"|"subtle"|"medium"|"dramatic", borderUsage: "none"|"subtle"|"structural", buttonStyle: "filled"|"outlined"|"ghost"|"text-link" }

### For photographs — include a "photograph" object:
- subjectArchetype: "portrait"|"landscape"|"still-life"|"architectural"|"fashion"|"abstract"
- focalPoint: { x: 0-1, y: 0-1, strength: "strong"|"diffuse" } — (0,0)=top-left, (1,1)=bottom-right
- compositionType: "centered"|"asymmetric"|"diagonal"|"layered"|"rule-of-thirds"
- depthLayers: "flat"|"shallow"|"deep"
- colorStory: how color guides the eye (prose)
- lightDirection: "front"|"side"|"back"|"ambient"|"dramatic-contrast"
- mood: prose description

### For editorial — include an "editorial" object:
- textImageRelationship: "overlay"|"adjacent"|"integrated"|"separated"
- typographyPlacement: "above-image"|"below-image"|"over-image"|"beside-image"
- whiteSpaceStrategy: "breathing"|"tension"|"dramatic"
- imageCropping: "full-bleed"|"contained"|"bled-off-edge"
- pacing: "even"|"building"|"contrasting"
- baselineGridAdherence: "strict"|"optical"|"free"
- typeToMargin: "tight-tension"|"generous-breathing"|"edge-anchored"
- captionTreatment: "small-below"|"side-aligned"|"integrated"|"none" (optional)
- pullQuoteScale: "subtle"|"moderate"|"dramatic" (optional)
- paragraphSpacing: "indents"|"line-breaks"|"extra-leading"

### For posters — use the "editorial" object format
### For mixed — populate the dominant type's object. Set secondaryTraits.

Respond with ONLY the JSON object, no markdown fences, no explanation.`;

// ── Validation ───────────────────────────────────────────────────────────────
export function validateCompositionAnalysis(raw: Partial<CompositionAnalysis>): CompositionAnalysis | null {
  if (!raw.referenceType || !VALID_REFERENCE_TYPES.has(raw.referenceType)) return null;
  if (!raw.keyCompositionalMove || !raw.balance || !raw.density || !raw.tension) return null;

  return {
    referenceType: raw.referenceType,
    secondaryTraits: raw.secondaryTraits,
    referenceConfidence: raw.referenceConfidence ?? "medium",
    era: raw.era ?? "contemporary",
    analyzedAt: "",
    balance: raw.balance,
    density: raw.density,
    tension: raw.tension,
    keyCompositionalMove: raw.keyCompositionalMove,
    spacingSystem: raw.spacingSystem ?? "8px-grid",
    typographicDensity: raw.typographicDensity ?? "balanced",
    hierarchyClarity: raw.hierarchyClarity ?? "obvious",
    displayTypePlacement: raw.displayTypePlacement ?? "centered",
    lineHeightCharacter: raw.lineHeightCharacter ?? "balanced-readable",
    letterSpacingIntent: raw.letterSpacingIntent ?? "neutral",
    headingToBodyRatio: raw.headingToBodyRatio ?? "moderate",
    specialLayouts: raw.specialLayouts,
    ...(raw.appUi ? { appUi: raw.appUi } : {}),
    screenshot: raw.screenshot,
    photograph: raw.photograph,
    editorial: raw.editorial,
  };
}

// ── Core ─────────────────────────────────────────────────────────────────────

export type AnalyzeCompositionResult =
  | { ok: true; analysis: CompositionAnalysis }
  | { ok: false; status: number; error: string };

/** Analyze one reference image into a CompositionAnalysis (vision model). */
export async function analyzeCompositionImage(imageUrl: string): Promise<AnalyzeCompositionResult> {
  if (!imageUrl?.trim()) return { ok: false, status: 400, error: "imageUrl is required" };
  if (imageUrl.length > 4096) return { ok: false, status: 413, error: "imageUrl is too long" };
  if (!process.env.OPENROUTER_API_KEY) {
    return { ok: false, status: 500, error: "OPENROUTER_API_KEY is not configured" };
  }

  logSafe("[taste/analyze-composition] Calling vision model", { imageUrlLength: imageUrl.length });

  const response = await tracedCompletion("taste.analyze-composition", {
    model: SONNET_4_6,
    max_tokens: 3000,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: COMPOSITION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this image and return a CompositionAnalysis JSON object." },
          imageUrlBlock(imageUrl),
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  if (response.choices[0]?.finish_reason === "length") {
    warnSafe("[taste/analyze-composition] Model hit max_tokens — response may be truncated");
  }

  let raw: Partial<CompositionAnalysis> = {};
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ok: false, status: 502, error: "Model returned non-JSON response" };
    raw = JSON.parse(jsonMatch[0]) as Partial<CompositionAnalysis>;
  } catch (parseErr) {
    warnSafe("[taste/analyze-composition] JSON parse failed", {
      message: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
    return { ok: false, status: 502, error: "Failed to parse model response" };
  }

  const validated = validateCompositionAnalysis(raw);
  if (!validated) return { ok: false, status: 502, error: "Model response missing required fields" };
  validated.analyzedAt = new Date().toISOString();
  return { ok: true, analysis: validated };
}
