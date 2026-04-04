import { NextRequest, NextResponse } from "next/server";
import {
  ANALYSIS_PROMPT,
  DESIGN_DIRECTOR_SYSTEM_PROMPT,
  type ImageAnalysis,
} from "@/lib/canvas/analyze-images";
import { getRouter, GEMINI_FLASH, imageUrlBlock } from "@/lib/ai/model-router";

function fallbackAnalysis(images: string[]): ImageAnalysis {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images } = body as { images: string[] };

    console.log(`[canvas/analyze] Received ${images?.length ?? 0} images, first image type: ${images?.[0]?.slice(0, 30)}...`);

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // Demo/offline mode: keep the V3.1 prompt flow alive with a deterministic
      // local analysis instead of hard-failing the entire generation request.
      return NextResponse.json({ analysis: fallbackAnalysis(images), fallback: true });
    }

    const router = getRouter();

    // Cap at 8 images — quality gate inside the prompt handles the rest
    const imageContent = images.slice(0, 8).map((img) => imageUrlBlock(img, "auto"));

    const response = await router.chat.completions.create({
      model: GEMINI_FLASH,
      messages: [
        {
          role: "system",
          content: DESIGN_DIRECTOR_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            { type: "text", text: ANALYSIS_PROMPT },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 2200,
      temperature: 0.15,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";

    let analysis: ImageAnalysis;
    try {
      // response_format: json_object guarantees valid JSON from the model,
      // but we still parse via regex as a safety net for models that ignore it.
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      analysis = JSON.parse(jsonMatch[0]) as ImageAnalysis;
    } catch (parseErr) {
      const parseMessage = parseErr instanceof Error ? parseErr.message : "Unknown parse error";
      console.error(`[canvas/analyze] JSON parse failed: ${parseMessage}. Raw response (first 500 chars):`, text.slice(0, 500));
      return NextResponse.json(
        { error: `Failed to parse analysis response: ${parseMessage}`, raw: text.slice(0, 500) },
        { status: 500 }
      );
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

    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    const stack = err instanceof Error ? err.stack : "";
    console.warn(`[canvas/analyze] Falling back after error: ${message}`);
    if (stack) console.warn(`[canvas/analyze] Stack: ${stack}`);
    return NextResponse.json({ analysis: fallbackAnalysis([]), fallback: true });
  }
}
