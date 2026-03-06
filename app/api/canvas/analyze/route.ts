import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ANALYSIS_PROMPT, type ImageAnalysis } from "@/lib/canvas/analyze-images";

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

    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] =
      images.slice(0, 6).map((img) => {
        if (img.startsWith("data:")) {
          return {
            type: "image_url" as const,
            image_url: { url: img, detail: "low" as const },
          };
        }
        return {
          type: "image_url" as const,
          image_url: { url: img, detail: "low" as const },
        };
      });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ANALYSIS_PROMPT },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse analysis response" },
        { status: 500 }
      );
    }

    const analysis: ImageAnalysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
