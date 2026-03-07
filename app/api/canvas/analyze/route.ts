import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ANALYSIS_PROMPT,
  DESIGN_DIRECTOR_SYSTEM_PROMPT,
  type ImageAnalysis,
} from "@/lib/canvas/analyze-images";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images } = body as { images: string[] };

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured. Add it to your .env.local file." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Cap at 8 images — quality gate inside the prompt handles the rest
    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] =
      images.slice(0, 8).map((img) => ({
        type: "image_url" as const,
        image_url: {
          url: img,
          // Use "high" detail for better colour accuracy on the quality scoring pass.
          // Falls back gracefully on gpt-4o-mini which only supports "low" | "auto".
          detail: "auto" as const,
        },
      }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      // Increased budget: quality scores + confidence fields add ~400 tokens to the response
      max_tokens: 2200,
      // Lower temperature for more precise hex values and consistent scoring
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
    } catch {
      return NextResponse.json(
        { error: "Failed to parse analysis response", raw: text },
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
