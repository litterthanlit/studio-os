import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { COMPONENT_GENERATION_PROMPT } from "@/lib/canvas/generate-component";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, tokens } = body as {
      prompt: string;
      tokens: DesignSystemTokens;
    };

    if (!prompt || !tokens) {
      return NextResponse.json(
        { error: "Prompt and design tokens are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured. Add it to your .env.local file." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: COMPONENT_GENERATION_PROMPT(tokens, prompt),
        },
      ],
      max_tokens: 4000,
      temperature: 0.5,
    });

    let code = response.choices[0]?.message?.content ?? "";

    code = code
      .replace(/^```(?:tsx?|jsx?|javascript|typescript)?\s*\n?/gm, "")
      .replace(/\n?```\s*$/gm, "")
      .trim();

    const nameMatch = code.match(
      /(?:function|const)\s+(\w+)/
    );
    const name = nameMatch?.[1] || "GeneratedComponent";

    return NextResponse.json({
      code,
      name,
      description: `Generated from prompt: "${prompt}"`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Component generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
