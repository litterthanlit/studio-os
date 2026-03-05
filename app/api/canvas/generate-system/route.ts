import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ImageAnalysis } from "@/lib/canvas/analyze-images";
import { analysisToTokens, tokensToMarkdown, SYSTEM_GENERATION_PROMPT } from "@/lib/canvas/generate-system";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysis, mode } = body as {
      analysis: ImageAnalysis;
      mode?: "auto" | "ai";
    };

    if (!analysis) {
      return NextResponse.json({ error: "No analysis provided" }, { status: 400 });
    }

    const tokens = analysisToTokens(analysis);

    if (mode === "ai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        const markdown = tokensToMarkdown(tokens);
        return NextResponse.json({ markdown, tokens });
      }

      const openai = new OpenAI({ apiKey });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_GENERATION_PROMPT },
          {
            role: "user",
            content: `Here is the visual analysis:\n${JSON.stringify(analysis, null, 2)}`,
          },
        ],
        max_tokens: 3000,
        temperature: 0.4,
      });

      const markdown = response.choices[0]?.message?.content ?? tokensToMarkdown(tokens);
      return NextResponse.json({ markdown, tokens });
    }

    const markdown = tokensToMarkdown(tokens);
    return NextResponse.json({ markdown, tokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : "System generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
