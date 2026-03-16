import { NextRequest, NextResponse } from "next/server";
import {
  ANALYSIS_PROMPT,
  DESIGN_DIRECTOR_SYSTEM_PROMPT,
  type ImageAnalysis,
} from "@/lib/canvas/analyze-images";
import { getRouter, GEMINI_FLASH, imageUrlBlock } from "@/lib/ai/model-router";

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
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured. Add it to your .env.local file." },
        { status: 500 }
      );
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
    console.error(`[canvas/analyze] Error: ${message}`);
    if (stack) console.error(`[canvas/analyze] Stack: ${stack}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
