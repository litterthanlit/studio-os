import { NextRequest, NextResponse } from "next/server";
import { getRouter, SONNET_4_6, imageUrlBlock } from "@/lib/ai/model-router";
import { scoreImagesBatch } from "@/lib/ai/image-scorer";
import type { TasteProfile } from "@/types/taste-profile";
// Skill context is now inlined — no file system reads needed

type CachedTasteProfile = {
  signature: string;
  profile: TasteProfile;
};

type TasteExtractBody = {
  projectId?: string;
  referenceUrls?: string[];
  existingTokens?: unknown;
};

const tasteCache = new Map<string, CachedTasteProfile>();

// ── Inline skill context (condensed — previously loaded 10+ markdown files at ~700K tokens) ──

function getSkillContext(): string {
  return `Archetypes:
premium-saas = sharp product system, restrained accent, dense-but-breathing
editorial-brand = serif/sans contrast, asymmetric grids, dramatic whitespace
minimal-tech = monochrome, oversized type, product-led restraint
creative-portfolio = experimental layouts, identity-first composition
culture-brand = warm palette, human tone, lifestyle imagery
experimental = rule-breaking type, bold contrast, controlled visual noise

Vocabulary:
layout = spacious|balanced|dense, strict|fluid|broken|editorial
hero = full-bleed|split|text-dominant|contained
type = geometric|humanist|editorial|technical|expressive
color = dark|light|mixed, single-pop|gradient-bold|no-accent
radius = none|subtle|rounded|pill`;
}

// ── System prompt ───────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  return `You are the Taste Engine for Studio OS — a reference-informed design intelligence system.

Your job is to analyze visual references and produce a structured TasteProfile JSON that drives website generation. You have deep knowledge of design archetypes, typography systems, color behavior, and layout patterns.

## Rules

1. Identify the primary archetype from: premium-saas, editorial-brand, minimal-tech, creative-portfolio, culture-brand, experimental
2. Be specific and opinionated — generic output ("modern", "clean", "professional") is a failure
3. Provide REAL hex color values derived from analyzing the references, not defaults or placeholders
4. Recommend specific font pairings by name (e.g., "Inter + Newsreader"), never generic families
5. Include at least 5 specific, actionable items in avoid[]
6. Set confidence based on reference count and coherence — never default to high confidence
7. Non-web references (photography, posters, art) inform MOOD and TREATMENT, not literal layout
8. If references are incoherent, set confidence low and list conflicts in warnings[]
9. adjectives must be specific to this project — "modern", "clean", "professional" are banned
10. archetypeConfidence of 1.0 is almost never correct — cap at 0.92 unless you have 10+ coherent references
11. Keep the JSON concise and compact. No extra whitespace-heavy prose.
12. summary must be 1 sentence. warnings max 3. recommendedPairings max 2. avoid exactly 5 items.

${getSkillContext()}

Respond ONLY with valid JSON matching the TasteProfile schema. No markdown, no explanation, just JSON.`;
}

function summarizeExistingTokens(existingTokens: unknown) {
  if (!existingTokens || typeof existingTokens !== "object") return null;
  const tokens = existingTokens as {
    colors?: Record<string, string>;
    typography?: { fontFamily?: string };
  };

  return {
    colors: tokens.colors
      ? {
          background: tokens.colors.background,
          surface: tokens.colors.surface,
          text: tokens.colors.text,
          accent: tokens.colors.accent,
          primary: tokens.colors.primary,
        }
      : undefined,
    fontFamily: tokens.typography?.fontFamily,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b)
  );
  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

function buildSignature(referenceUrls: string[], existingTokens?: unknown) {
  return stableStringify({
    referenceUrls: [...referenceUrls].sort(),
    existingTokens: existingTokens ?? null,
  });
}

function computeConfidence(
  referenceCount: number,
  scores: Array<{ scores: { overall: number }; style: string; mood: string }>
) {
  const countScore = referenceCount >= 6 ? 0.34 : referenceCount >= 3 ? 0.26 : 0.16;
  const averageOverall =
    scores.length > 0
      ? scores.reduce((sum, item) => sum + item.scores.overall, 0) / scores.length
      : 55;
  const qualityScore = Math.max(0.18, Math.min(0.38, (averageOverall / 100) * 0.38));

  const styleCounts = new Map<string, number>();
  const moodCounts = new Map<string, number>();
  for (const item of scores) {
    styleCounts.set(item.style, (styleCounts.get(item.style) ?? 0) + 1);
    moodCounts.set(item.mood, (moodCounts.get(item.mood) ?? 0) + 1);
  }

  const dominantStyle = Math.max(...Array.from(styleCounts.values()), 1);
  const dominantMood = Math.max(...Array.from(moodCounts.values()), 1);
  const styleConsistency = dominantStyle / Math.max(scores.length, 1);
  const moodConsistency = dominantMood / Math.max(scores.length, 1);
  const consistencyScore = Math.max(
    0.16,
    Math.min(0.28, ((styleConsistency + moodConsistency) / 2) * 0.28)
  );

  return Math.max(
    0,
    Math.min(1, Number((countScore + qualityScore + consistencyScore).toFixed(2)))
  );
}

function fallbackTasteProfile(confidence = 0.42): TasteProfile {
  return {
    summary:
      "The project direction is intentional and system-led, with references pointing toward a refined, editorially controlled visual language. Preserve the existing palette and typography choices, then sharpen the layout and imagery to keep the result coherent rather than generic.",
    adjectives: ["intentional", "editorial", "refined", "structured"],
    archetypeMatch: "premium-saas",
    archetypeConfidence: confidence,
    layoutBias: {
      density: "balanced",
      rhythm: "alternating",
      heroStyle: "contained",
      sectionFlow: "stacked",
      gridBehavior: "strict",
      whitespaceIntent: "structural",
    },
    typographyTraits: {
      scale: "expanded",
      headingTone: "geometric",
      bodyTone: "neutral",
      contrast: "high",
      casePreference: "mixed",
      recommendedPairings: ["Inter + Inter", "Space Grotesk + DM Sans"],
    },
    colorBehavior: {
      mode: "light",
      palette: "neutral-plus-accent",
      accentStrategy: "single-pop",
      saturation: "muted",
      temperature: "neutral",
      suggestedColors: {
        background: "#FAFAFA",
        surface: "#F5F5F5",
        text: "#111111",
        accent: "#3B5EFC",
        secondary: "#E8E8E8",
      },
    },
    imageTreatment: {
      style: "product",
      sizing: "contained",
      treatment: "raw",
      cornerRadius: "subtle",
      borders: true,
      shadow: "subtle",
      aspectPreference: "landscape",
    },
    ctaTone: {
      style: "understated",
      shape: "subtle-radius",
      hierarchy: "primary-dominant",
    },
    avoid: [
      "generic gradients",
      "overcrowded sections",
      "random accent colors",
      "stock photography of people using laptops",
      "blue-purple startup color palette",
    ],
    confidence,
    referenceCount: 0,
    dominantReferenceType: "ui-screenshot",
    warnings: ["Low reference count — profile may lack specificity"],
  };
}

function normalizeTasteProfile(
  raw: Partial<TasteProfile>,
  fallback: TasteProfile,
  confidence: number
): TasteProfile {
  const layoutBias: TasteProfile["layoutBias"] = {
    density: raw.layoutBias?.density ?? fallback.layoutBias.density,
    rhythm: raw.layoutBias?.rhythm ?? fallback.layoutBias.rhythm,
    heroStyle: raw.layoutBias?.heroStyle ?? fallback.layoutBias.heroStyle,
    sectionFlow: raw.layoutBias?.sectionFlow ?? fallback.layoutBias.sectionFlow,
    gridBehavior: raw.layoutBias?.gridBehavior ?? fallback.layoutBias.gridBehavior,
    whitespaceIntent: raw.layoutBias?.whitespaceIntent ?? fallback.layoutBias.whitespaceIntent,
  };

  const typographyTraits: TasteProfile["typographyTraits"] = {
    scale: raw.typographyTraits?.scale ?? fallback.typographyTraits.scale,
    headingTone: raw.typographyTraits?.headingTone ?? fallback.typographyTraits.headingTone,
    bodyTone: raw.typographyTraits?.bodyTone ?? fallback.typographyTraits.bodyTone,
    contrast: raw.typographyTraits?.contrast ?? fallback.typographyTraits.contrast,
    casePreference: raw.typographyTraits?.casePreference ?? fallback.typographyTraits.casePreference,
    recommendedPairings:
      raw.typographyTraits?.recommendedPairings?.length
        ? raw.typographyTraits.recommendedPairings
        : fallback.typographyTraits.recommendedPairings,
  };

  const colorBehavior: TasteProfile["colorBehavior"] = {
    mode: raw.colorBehavior?.mode ?? fallback.colorBehavior.mode,
    palette: raw.colorBehavior?.palette ?? fallback.colorBehavior.palette,
    accentStrategy: raw.colorBehavior?.accentStrategy ?? fallback.colorBehavior.accentStrategy,
    saturation: raw.colorBehavior?.saturation ?? fallback.colorBehavior.saturation,
    temperature: raw.colorBehavior?.temperature ?? fallback.colorBehavior.temperature,
    suggestedColors: {
      background:
        raw.colorBehavior?.suggestedColors?.background ??
        fallback.colorBehavior.suggestedColors.background,
      surface:
        raw.colorBehavior?.suggestedColors?.surface ??
        fallback.colorBehavior.suggestedColors.surface,
      text:
        raw.colorBehavior?.suggestedColors?.text ??
        fallback.colorBehavior.suggestedColors.text,
      accent:
        raw.colorBehavior?.suggestedColors?.accent ??
        fallback.colorBehavior.suggestedColors.accent,
      secondary:
        raw.colorBehavior?.suggestedColors?.secondary ??
        fallback.colorBehavior.suggestedColors.secondary,
    },
  };

  const imageTreatment: TasteProfile["imageTreatment"] = {
    style: raw.imageTreatment?.style ?? fallback.imageTreatment.style,
    sizing: raw.imageTreatment?.sizing ?? fallback.imageTreatment.sizing,
    treatment: raw.imageTreatment?.treatment ?? fallback.imageTreatment.treatment,
    cornerRadius: raw.imageTreatment?.cornerRadius ?? fallback.imageTreatment.cornerRadius,
    borders: raw.imageTreatment?.borders ?? fallback.imageTreatment.borders,
    shadow: raw.imageTreatment?.shadow ?? fallback.imageTreatment.shadow,
    aspectPreference: raw.imageTreatment?.aspectPreference ?? fallback.imageTreatment.aspectPreference,
  };

  const ctaTone: TasteProfile["ctaTone"] = {
    style: raw.ctaTone?.style ?? fallback.ctaTone.style,
    shape: raw.ctaTone?.shape ?? fallback.ctaTone.shape,
    hierarchy: raw.ctaTone?.hierarchy ?? fallback.ctaTone.hierarchy,
  };

  return {
    summary: raw.summary ?? fallback.summary,
    adjectives: raw.adjectives?.length ? raw.adjectives : fallback.adjectives,
    archetypeMatch: raw.archetypeMatch ?? fallback.archetypeMatch,
    archetypeConfidence:
      typeof raw.archetypeConfidence === "number"
        ? Math.max(0, Math.min(0.92, raw.archetypeConfidence))
        : fallback.archetypeConfidence,
    secondaryArchetype: raw.secondaryArchetype,
    layoutBias,
    typographyTraits,
    colorBehavior,
    imageTreatment,
    ctaTone,
    avoid: raw.avoid?.length ? raw.avoid : fallback.avoid,
    confidence:
      typeof raw.confidence === "number"
        ? Math.max(0, Math.min(1, raw.confidence))
        : confidence,
    referenceCount:
      typeof raw.referenceCount === "number" ? raw.referenceCount : fallback.referenceCount,
    dominantReferenceType: raw.dominantReferenceType ?? fallback.dominantReferenceType,
    warnings: raw.warnings ?? [],
  };
}

// ── Route ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  console.log("[taste/extract] OPENROUTER_API_KEY present:", !!process.env.OPENROUTER_API_KEY);
  try {
    const body = (await req.json()) as TasteExtractBody;
    const projectId = body.projectId?.trim();
    const referenceUrls = (body.referenceUrls ?? []).filter(Boolean);
    const existingTokens = body.existingTokens ?? null;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    if (referenceUrls.length === 0) {
      return NextResponse.json({ error: "referenceUrls are required" }, { status: 400 });
    }

    const signature = buildSignature(referenceUrls, existingTokens);
    const cached = tasteCache.get(projectId);
    if (cached && cached.signature === signature) {
      return NextResponse.json(cached.profile);
    }

    const scoredMap = await scoreImagesBatch(
      referenceUrls.map((url, index) => ({ id: `${index}`, url })),
      { delayMs: 0 }
    );
    const scoredImages = referenceUrls.map((url, index) => ({
      url,
      ...(scoredMap.get(`${index}`) ?? {
        scores: { composition: 65, color: 65, mood: 65, uniqueness: 65, overall: 65 },
        tags: ["curated", "reference"],
        colors: [],
        mood: "refined",
        style: "editorial",
        reasoning: "Fallback analysis used.",
      }),
    }));

    const derivedConfidence = computeConfidence(referenceUrls.length, scoredImages);
    const fallback = fallbackTasteProfile(derivedConfidence);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      tasteCache.set(projectId, { signature, profile: fallback });
      return NextResponse.json(fallback);
    }

    const router = getRouter();

    const imageContent = referenceUrls.slice(0, 5).map((url) => imageUrlBlock(url));

    // Strip URLs from scored data to avoid sending base64 data as text
    // (the images are already sent as vision blocks below)
    const scoredSummary = scoredImages.map((img, i) => ({
      index: i,
      scores: img.scores,
      tags: img.tags,
      colors: img.colors,
      mood: img.mood,
      style: img.style,
    }));

    const existingTokenSummary = summarizeExistingTokens(existingTokens);

    console.log(
      `[taste/extract] Calling Sonnet 4.6 with ${Math.min(
        referenceUrls.length,
        5
      )} images, system prompt ~${buildSystemPrompt().length} chars`
    );

    const response = await router.chat.completions.create({
      model: SONNET_4_6,
      max_tokens: 2600,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze these ${referenceUrls.length} visual references and return a compact TasteProfile JSON.

Project ID: ${projectId}
Reference count: ${referenceUrls.length}

Scored image summary:
${JSON.stringify(scoredSummary)}

${existingTokenSummary ? `Existing token summary:\n${JSON.stringify(existingTokenSummary)}` : "No existing tokens."}

Return compact JSON only. Do not pretty-print. Fill every field, but keep strings tight and specific.`,
            },
            ...imageContent,
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const finishReason = response.choices[0]?.finish_reason;
    console.log(`[taste/extract] Sonnet responded: ${text.length} chars, finish_reason: ${finishReason}`);

    if (finishReason === "length") {
      console.warn("[taste/extract] Sonnet hit max_tokens — response likely truncated");
    }

    let raw: Partial<TasteProfile> = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        raw = JSON.parse(jsonMatch[0]) as Partial<TasteProfile>;
      } else {
        console.error("[taste/extract] No JSON found in response. First 300 chars:", text.slice(0, 300));
      }
    } catch (parseErr) {
      console.error("[taste/extract] JSON parse failed:", parseErr instanceof Error ? parseErr.message : parseErr);
      console.error("[taste/extract] Response tail (last 200 chars):", text.slice(-200));
      // Fall through to normalization with empty raw — will use fallback values
    }

    const profile = normalizeTasteProfile(raw, fallback, derivedConfidence);

    tasteCache.set(projectId, { signature, profile });
    return NextResponse.json(profile);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Taste profile extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
