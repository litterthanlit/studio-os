import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { buildSitePrompt, type SectionId } from "@/lib/canvas/generate-site";
import {
  compilePageTreeToTSX,
  createVariantSet,
  inferSiteName,
} from "@/lib/canvas/compose";
import type { SiteType } from "@/lib/canvas/templates";

function createVariantPreviewImage(
  name: string,
  tokens: DesignSystemTokens
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" viewBox="0 0 720 520" fill="none">
      <rect width="720" height="520" rx="32" fill="${tokens.colors.background}" />
      <rect x="36" y="36" width="648" height="108" rx="24" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="36" y="172" width="648" height="148" rx="28" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="36" y="348" width="202" height="136" rx="24" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="258" y="348" width="202" height="136" rx="24" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="480" y="348" width="204" height="136" rx="24" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="60" y="60" width="140" height="14" rx="7" fill="${tokens.colors.textMuted}" opacity="0.55" />
      <rect x="60" y="90" width="320" height="22" rx="11" fill="${tokens.colors.text}" />
      <rect x="60" y="204" width="220" height="12" rx="6" fill="${tokens.colors.textMuted}" opacity="0.55" />
      <rect x="60" y="232" width="512" height="22" rx="11" fill="${tokens.colors.text}" />
      <rect x="60" y="268" width="428" height="14" rx="7" fill="${tokens.colors.textMuted}" opacity="0.65" />
      <rect x="60" y="388" width="88" height="88" rx="22" fill="${tokens.colors.primary}" opacity="0.92" />
      <rect x="282" y="388" width="88" height="88" rx="22" fill="${tokens.colors.secondary}" opacity="0.92" />
      <rect x="504" y="388" width="88" height="88" rx="22" fill="${tokens.colors.accent}" opacity="0.92" />
      <text x="648" y="70" text-anchor="end" fill="${tokens.colors.textMuted}" font-size="18" font-family="Arial, sans-serif">${name}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      tokens,
      sectionId,
      existingSections,
      mode,
      siteType,
      siteName,
    } = body as {
      prompt: string;
      tokens: DesignSystemTokens;
      sectionId?: SectionId;
      existingSections?: string;
      mode?: "single" | "variants";
      siteType?: SiteType;
      siteName?: string;
    };

    if (!prompt || !tokens) {
      return NextResponse.json(
        { error: "Prompt and design tokens are required" },
        { status: 400 }
      );
    }

    if (mode === "variants") {
      const resolvedSiteName = siteName || inferSiteName(prompt);
      const variants = createVariantSet(
        prompt,
        tokens,
        siteType ?? "auto",
        resolvedSiteName
      ).map((variant) => ({
        ...variant,
        previewImage: createVariantPreviewImage(variant.name, tokens),
        compiledCode: compilePageTreeToTSX(
          variant.pageTree,
          tokens,
          variant.name.replace(/\s+/g, "")
        ),
      }));

      return NextResponse.json({
        siteName: resolvedSiteName,
        variants,
      });
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
