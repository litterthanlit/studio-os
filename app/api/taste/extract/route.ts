import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { scoreImagesBatch } from "@/lib/ai/image-scorer";
import type { TasteProfile } from "@/types/taste-profile";

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

const TASTE_PROFILE_SYSTEM_PROMPT = `You are a senior design director and curation lead for Studio OS.

Your job is to translate a set of curated visual references into a structured taste profile for downstream website generation and editing. Be specific, opinionated, and concrete. Avoid generic design language.

Respond ONLY with valid JSON matching the requested schema.`;

const TASTE_PROFILE_PROMPT = `Create a TasteProfile from the visual references, image scoring analysis, and any existing design tokens.

You are filling this exact schema:
{
  "summary": "2-3 sentence summary",
  "adjectives": ["string"],
  "layoutBias": {
    "density": "string",
    "gridStyle": "string",
    "whitespacePreference": "string",
    "heroStyle": "string"
  },
  "typographyTraits": {
    "headingMood": "string",
    "bodyMood": "string",
    "scale": "string",
    "suggestedPairings": ["string"]
  },
  "colorBehavior": {
    "palette": ["#hex"],
    "dominantMood": "string",
    "contrast": "string",
    "backgroundPreference": "string"
  },
  "imageTreatment": {
    "style": "string",
    "mood": "string",
    "corners": "string",
    "overlays": "string"
  },
  "ctaTone": "aggressive" | "subtle" | "minimal",
  "avoid": ["string"],
  "confidence": 0.0
}

Rules:
- Be additive to existing tokens, not duplicative.
- Use the scoring analysis to understand quality, mood, and consistency across references.
- summary should be 2-3 sentences.
- adjectives should be 4-8 strong descriptors.
- palette should contain 3-6 colors.
- suggestedPairings should be concrete stylistic pairings.
- avoid should contain concrete anti-patterns that would dilute this direction.
- confidence should reflect reference count, quality, and consistency.`;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
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
  const qualityScore = Math.max(0.18, Math.min(0.38, averageOverall / 100 * 0.38));

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

  return Math.max(0, Math.min(1, Number((countScore + qualityScore + consistencyScore).toFixed(2))));
}

function fallbackTasteProfile(existingTokens?: unknown, confidence = 0.42): TasteProfile {
  const tokenPalette = Array.isArray(existingTokens)
    ? []
    : existingTokens && typeof existingTokens === "object" && "colors" in (existingTokens as Record<string, unknown>)
    ? Object.values(((existingTokens as { colors?: Record<string, string> }).colors ?? {})).slice(0, 5)
    : [];

  return {
    summary:
      "The project direction is intentional and system-led, with references pointing toward a refined, editorially controlled visual language. Preserve the existing palette and typography choices, then sharpen the layout and imagery to keep the result coherent rather than generic.",
    adjectives: ["intentional", "editorial", "refined", "structured"],
    layoutBias: {
      density: "balanced",
      gridStyle: "modular editorial grid",
      whitespacePreference: "generous whitespace around hero and transitions",
      heroStyle: "clear headline-led hero with measured proof and CTA",
    },
    typographyTraits: {
      headingMood: "confident and composed",
      bodyMood: "quiet and readable",
      scale: "high contrast between display and body sizes",
      suggestedPairings: ["Display serif with clean sans body"],
    },
    colorBehavior: {
      palette: tokenPalette.length > 0 ? tokenPalette : ["#111111", "#F5F5F5", "#3B5EFC"],
      dominantMood: "controlled",
      contrast: "medium-high contrast with deliberate accents",
      backgroundPreference: "clean surfaces with subtle tonal shifts",
    },
    imageTreatment: {
      style: "curated photography with restrained composition",
      mood: "polished and taste-led",
      corners: "soft radii on media, sharper structure on layout",
      overlays: "minimal overlays with low visual noise",
    },
    ctaTone: "subtle",
    avoid: ["generic gradients", "overcrowded sections", "random accent colors"],
    confidence,
  };
}

function normalizeTasteProfile(
  raw: Partial<TasteProfile>,
  fallback: TasteProfile,
  confidence: number
): TasteProfile {
  return {
    summary: raw.summary ?? fallback.summary,
    adjectives: raw.adjectives?.length ? raw.adjectives : fallback.adjectives,
    layoutBias: raw.layoutBias ?? fallback.layoutBias,
    typographyTraits: raw.typographyTraits ?? fallback.typographyTraits,
    colorBehavior: {
      ...fallback.colorBehavior,
      ...(raw.colorBehavior ?? {}),
      palette:
        raw.colorBehavior?.palette?.length
          ? raw.colorBehavior.palette
          : fallback.colorBehavior.palette,
    },
    imageTreatment: raw.imageTreatment ?? fallback.imageTreatment,
    ctaTone:
      raw.ctaTone === "aggressive" ||
      raw.ctaTone === "subtle" ||
      raw.ctaTone === "minimal"
        ? raw.ctaTone
        : fallback.ctaTone,
    avoid: raw.avoid?.length ? raw.avoid : fallback.avoid,
    confidence:
      typeof raw.confidence === "number"
        ? Math.max(0, Math.min(1, raw.confidence))
        : confidence,
  };
}

export async function POST(req: NextRequest) {
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
    const fallback = fallbackTasteProfile(existingTokens, derivedConfidence);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      tasteCache.set(projectId, { signature, profile: fallback });
      return NextResponse.json(fallback);
    }

    const openai = new OpenAI({ apiKey });
    const imageContent = referenceUrls.slice(0, 8).map((url) => ({
      type: "image_url" as const,
      image_url: {
        url,
        detail: "auto" as const,
      },
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: TASTE_PROFILE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${TASTE_PROFILE_PROMPT}

Project ID: ${projectId}
Reference count: ${referenceUrls.length}
Existing tokens:
${JSON.stringify(existingTokens, null, 2)}

Vision and curation analysis:
${JSON.stringify(scoredImages, null, 2)}

Set confidence using this baseline guidance:
- 3+ strong references with coherent patterns should land high
- mixed quality or conflicting directions should lower confidence
- weak or sparse references should produce caution in the profile`,
            },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 1800,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? (JSON.parse(jsonMatch[0]) as Partial<TasteProfile>) : {};
    const profile = normalizeTasteProfile(raw, fallback, derivedConfidence);

    tasteCache.set(projectId, { signature, profile });
    return NextResponse.json(profile);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Taste profile extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
