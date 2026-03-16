import { NextRequest, NextResponse } from "next/server";
import type { ImageAnalysis } from "@/lib/canvas/analyze-images";
import { analysisToTokens, tokensToMarkdown } from "@/lib/canvas/generate-system";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysis } = body as {
      analysis: ImageAnalysis;
      mode?: string;
    };

    if (!analysis) {
      return NextResponse.json({ error: "No analysis provided" }, { status: 400 });
    }

    const tokens = analysisToTokens(analysis);

    // The generated markdown is only explanatory; the actual tokens come from deterministic
    // analysisToTokens. Returning the deterministic markdown avoids large, quota-heavy model
    // calls that were truncating without improving the generation pipeline.
    return NextResponse.json({ markdown: tokensToMarkdown(tokens), tokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : "System generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
