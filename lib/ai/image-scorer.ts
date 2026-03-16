// lib/ai/image-scorer.ts
// Gemini 2.5 Flash via OpenRouter for scoring inspiration images

import { getRouter, GEMINI_FLASH, imageUrlBlock } from "@/lib/ai/model-router";

export interface ImageScore {
  composition: number;
  color: number;
  mood: number;
  uniqueness: number;
  overall: number;
}

export interface ImageAnalysis {
  scores: ImageScore;
  tags: string[];
  colors: string[];
  mood: string;
  style: string;
  reasoning: string;
}

const SCORING_PROMPT = `You are an expert design curator analyzing images for a creative studio's inspiration feed.

Analyze this image and score it on four criteria (0-100):

1. COMPOSITION (0-100): Balance, visual hierarchy, rule of thirds, negative space usage, framing
2. COLOR (0-100): Color harmony, palette sophistication, contrast, color psychology
3. MOOD (0-100): Emotional impact, atmosphere, storytelling, evocativeness
4. UNIQUENESS (0-100): Originality, creative approach, distinctiveness from common stock imagery

Also provide:
- Tags: 5-8 descriptive keywords (e.g., "minimal", "editorial", "warm tones", "architectural")
- Dominant colors: 3-5 hex colors found in the image
- Mood: Single word describing the feeling (e.g., "serene", "energetic", "mysterious")
- Style: Design style category (e.g., "minimalist", "brutalist", "organic", "futuristic")
- Reasoning: Brief 1-2 sentence explanation of why it scored this way

Calculate overall as weighted average: (composition * 0.3 + color * 0.25 + mood * 0.25 + uniqueness * 0.2)
Round all scores to integers.

Respond ONLY with valid JSON, no markdown formatting.`;

// Normalize Gemini's inconsistent response shape into ImageAnalysis.
// Gemini Flash returns flat uppercase keys (COMPOSITION, COLOR, etc.) or
// mixed-case variants (Tags, Dominant colors, Dominant_colors) instead of
// the nested lowercase structure we expect.
function normalizeGeminiResponse(raw: Record<string, unknown>): ImageAnalysis {
  // Build a flat lowercase-keyed map so we can do case-insensitive lookups
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    flat[k.toLowerCase().replace(/[\s_-]+/g, "")] = v;
  }

  // Scores: prefer nested `scores` object, fall back to flat top-level keys
  const nestedScores =
    flat["scores"] && typeof flat["scores"] === "object"
      ? (flat["scores"] as Record<string, unknown>)
      : null;

  function numScore(nestedKey: string, flatKey: string): number {
    const fromNested = nestedScores?.[nestedKey] ?? nestedScores?.[nestedKey.toUpperCase()];
    const fromFlat = flat[flatKey];
    const val = fromNested ?? fromFlat;
    return typeof val === "number" ? Math.round(val) : 65;
  }

  const composition = numScore("composition", "composition");
  const color = numScore("color", "color");
  const mood = numScore("mood", "mood");
  const uniqueness = numScore("uniqueness", "uniqueness");
  const overall = Math.round(
    composition * 0.3 + color * 0.25 + mood * 0.25 + uniqueness * 0.2
  );

  // Tags: "Tags", "tags", etc.
  const rawTags = flat["tags"];
  const tags = Array.isArray(rawTags)
    ? rawTags.map(String)
    : typeof rawTags === "string"
    ? rawTags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Colors: "Dominant colors", "Dominant_colors", "dominantcolors", "colors"
  const rawColors =
    flat["dominantcolors"] ?? flat["dominantcolor"] ?? flat["colors"] ?? flat["colour"] ?? [];
  const colors = Array.isArray(rawColors)
    ? rawColors.map(String)
    : typeof rawColors === "string"
    ? rawColors.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  // Mood/style/reasoning — Gemini may return "Mood" at top level separate from the score
  const moodStr =
    typeof flat["moodword"] === "string"
      ? flat["moodword"]
      : typeof flat["mood"] === "string"
      ? flat["mood"]
      : "refined";

  const styleStr = typeof flat["style"] === "string" ? flat["style"] : "editorial";
  const reasoningStr =
    typeof flat["reasoning"] === "string"
      ? flat["reasoning"]
      : typeof flat["explanation"] === "string"
      ? flat["explanation"]
      : "";

  return {
    scores: { composition, color, mood, uniqueness, overall },
    tags,
    colors,
    mood: moodStr,
    style: styleStr,
    reasoning: reasoningStr,
  };
}

export async function scoreImage(imageUrl: string): Promise<ImageAnalysis> {
  const router = getRouter();

  const response = await router.chat.completions.create({
    model: GEMINI_FLASH,
    max_tokens: 500,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: SCORING_PROMPT },
          imageUrlBlock(imageUrl, "low"),
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  if (!content) {
    throw new Error("No response from Gemini Flash via OpenRouter");
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const raw = JSON.parse(jsonStr) as Record<string, unknown>;
    return normalizeGeminiResponse(raw);
  } catch {
    console.error("[image-scorer] Failed to parse Gemini Flash response:", content);
    throw new Error("Failed to parse image analysis");
  }
}

export async function scoreImagesBatch(
  images: { id: string; url: string }[],
  options: { delayMs?: number; onProgress?: (completed: number, total: number) => void } = {}
): Promise<Map<string, ImageAnalysis>> {
  const { delayMs = 100, onProgress } = options;
  const results = new Map<string, ImageAnalysis>();

  for (let i = 0; i < images.length; i++) {
    const { id, url } = images[i];

    try {
      const analysis = await scoreImage(url);
      results.set(id, analysis);
    } catch (error) {
      console.error(`[image-scorer] Failed to score image ${id}:`, error);
    }

    onProgress?.(i + 1, images.length);

    if (i < images.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
