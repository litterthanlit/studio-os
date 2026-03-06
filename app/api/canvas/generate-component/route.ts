import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { buildSitePrompt, type SectionId } from "@/lib/canvas/generate-site";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, tokens, sectionId, existingSections } = body as {
      prompt: string;
      tokens: DesignSystemTokens;
      sectionId?: SectionId;
      existingSections?: string;
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

    const systemPrompt = buildSitePrompt(tokens, prompt, sectionId, existingSections);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 8000,
      temperature: 0.4,
    });

    let code = response.choices[0]?.message?.content ?? "";

    code = code
      .replace(/^```(?:tsx?|jsx?|javascript|typescript)?\s*\n?/gm, "")
      .replace(/\n?```\s*$/gm, "")
      .trim();

    const nameMatch = code.match(/export\s+default\s+function\s+(\w+)/);
    const name = nameMatch?.[1] || "Page";

    return NextResponse.json({
      code,
      name,
      description: sectionId
        ? `Regenerated section: ${sectionId}`
        : `Generated site from: "${prompt}"`,
      sectionId: sectionId || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Site generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
