import { NextRequest, NextResponse } from "next/server";
import { getRouter, SONNET_4_6, imageUrlBlock } from "@/lib/ai/model-router";
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
const SYSTEM_PROMPT = `You are an expert visual analyst specializing in design composition, art direction, and typographic layout. You analyze reference images to extract structural and compositional data that will inform AI-powered design generation.

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
function validateCompositionAnalysis(raw: Partial<CompositionAnalysis>): CompositionAnalysis | null {
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
    screenshot: raw.screenshot,
    photograph: raw.photograph,
    editorial: raw.editorial,
  };
}

// ── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeCompositionBody;
    const { imageUrl } = body;

    if (!imageUrl?.trim()) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 500 });
    }

    const router = getRouter();

    console.log("[taste/analyze-composition] Calling Sonnet 4.6 with image:", imageUrl.substring(0, 80));

    const response = await router.chat.completions.create({
      model: SONNET_4_6,
      max_tokens: 3000,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and return a CompositionAnalysis JSON object.",
            },
            imageUrlBlock(imageUrl),
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const finishReason = response.choices[0]?.finish_reason;
    console.log(`[taste/analyze-composition] Sonnet responded: ${text.length} chars, finish_reason: ${finishReason}`);

    if (finishReason === "length") {
      console.warn("[taste/analyze-composition] Sonnet hit max_tokens — response may be truncated");
    }

    let raw: Partial<CompositionAnalysis> = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        raw = JSON.parse(jsonMatch[0]) as Partial<CompositionAnalysis>;
      } else {
        console.error("[taste/analyze-composition] No JSON found in response. First 300 chars:", text.slice(0, 300));
        return NextResponse.json({ error: "Model returned non-JSON response" }, { status: 502 });
      }
    } catch (parseErr) {
      console.error("[taste/analyze-composition] JSON parse failed:", parseErr instanceof Error ? parseErr.message : parseErr);
      console.error("[taste/analyze-composition] Response tail (last 200 chars):", text.slice(-200));
      return NextResponse.json({ error: "Failed to parse model response" }, { status: 502 });
    }

    const validated = validateCompositionAnalysis(raw);
    if (!validated) {
      console.error("[taste/analyze-composition] Validation failed — missing required fields. raw:", JSON.stringify(raw).slice(0, 500));
      return NextResponse.json({ error: "Model response missing required fields" }, { status: 502 });
    }

    validated.analyzedAt = new Date().toISOString();

    return NextResponse.json(validated);
  } catch (err) {
    console.error("[taste/analyze-composition] Unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
