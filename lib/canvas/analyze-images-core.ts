import {
  ANALYSIS_PROMPT,
  DESIGN_DIRECTOR_SYSTEM_PROMPT,
  type ImageAnalysis,
} from "@/lib/canvas/analyze-images";
import { imageUrlBlock, tracedCompletion, modelFor } from "@/lib/ai/model-router";
import { API_LIMITS, capStringArray, logSafe, warnSafe } from "@/lib/security/api-guard";

export function fallbackAnalysis(images: string[]): ImageAnalysis {
  const usedImageCount = Math.min(images.length, 8);

  return {
    colors: {
      dominant: ["#4B57DB", "#0F172A", "#FAFAF8"],
      accents: ["#4B83F7"],
      neutrals: ["#FAFAF8", "#FFFFFF", "#E5E5E0"],
      confidence: {
        dominant: 0.45,
        accents: 0.4,
        neutrals: 0.5,
      },
    },
    typography: {
      category: "sans-serif",
      weights: ["400", "500", "700"],
      hierarchy: "Large editorial hero with structured supporting copy.",
      confidence: 0.35,
    },
    spacing: {
      density: "comfortable",
      rhythm: "modular",
      confidence: 0.4,
    },
    vibe: {
      density: "balanced",
      tone: "neutral",
      energy: "moderate",
    },
    designDirection: "Clean product marketing with an editorial blue accent and generous spacing.",
    summary:
      "Fallback analysis generated locally because the remote provider was unavailable. Use this as a steady baseline rather than a literal extraction from the references.",
    quality: {
      scores: Array.from({ length: usedImageCount }, () => ({
        composition: 6,
        colorHarmony: 6,
        visualNoise: 3,
        designRelevance: 6,
        overall: 6,
        usedForExtraction: true,
      })),
      dominantVibe: {
        label: "fallback",
        description: "Local fallback analysis generated because the remote provider was unavailable.",
        matchingImageIndices: images.map((_, index) => index).slice(0, usedImageCount),
      },
      usableImageCount: usedImageCount,
    },
  };
}

export type ReferenceImageAnalysisResult =
  | { ok: true; analysis: ImageAnalysis; fallback?: boolean }
  | { ok: false; status: number; error: string };

/**
 * Analyze reference images for design tokens (colors, type, spacing, vibe).
 * Falls back to a deterministic local analysis without a key or on provider errors.
 */
export async function analyzeReferenceImages(input: string[]): Promise<ReferenceImageAnalysisResult> {
  const images = capStringArray(input, API_LIMITS.maxAnalysisImages);
  if (images.length === 0) return { ok: false, status: 400, error: "No images provided" };
  if (!process.env.OPENROUTER_API_KEY) {
    return { ok: true, analysis: fallbackAnalysis(images), fallback: true };
  }

  try {
    const response = await tracedCompletion("tokens.analyze-images", {
      model: modelFor("measure"),
      messages: [
        { role: "system", content: DESIGN_DIRECTOR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [{ type: "text", text: ANALYSIS_PROMPT }, ...images.map((img) => imageUrlBlock(img, "auto"))],
        },
      ],
      max_tokens: 2200,
      temperature: 0.15,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    let analysis: ImageAnalysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      analysis = JSON.parse(jsonMatch[0]) as ImageAnalysis;
    } catch (parseErr) {
      const parseMessage = parseErr instanceof Error ? parseErr.message : "Unknown parse error";
      logSafe("[canvas/analyze] JSON parse failed", { message: parseMessage, responsePreview: text.slice(0, 500) });
      return { ok: false, status: 500, error: `Failed to parse analysis response: ${parseMessage}` };
    }

    // Sanity-patch: ensure quality.scores exists with at least one entry
    if (!analysis.quality?.scores?.length) {
      analysis.quality = {
        scores: images.slice(0, 8).map(() => ({
          composition: 5,
          colorHarmony: 5,
          visualNoise: 5,
          designRelevance: 5,
          overall: 5,
          usedForExtraction: true,
        })),
        dominantVibe: {
          label: "unknown",
          description: "Could not determine dominant vibe.",
          matchingImageIndices: [],
        },
        usableImageCount: images.length,
      };
    }
    return { ok: true, analysis };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    warnSafe("[canvas/analyze] Falling back after error", { message });
    return { ok: true, analysis: fallbackAnalysis([]), fallback: true };
  }
}
