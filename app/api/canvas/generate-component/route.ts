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
import type { TasteProfile } from "@/types/taste-profile";

type VariantStrategy = {
  key: "safe" | "creative" | "alternative";
  label: string;
  note: string;
};

const VARIANT_STRATEGIES: VariantStrategy[] = [
  {
    key: "safe",
    label: "Variant A",
    note: "This variant stays closest to your reference signal and protects the strongest taste cues.",
  },
  {
    key: "creative",
    label: "Variant B",
    note: "This variant pushes the visual interpretation while staying grounded in your references.",
  },
  {
    key: "alternative",
    label: "Variant C",
    note: "This variant keeps the same taste but explores a different layout direction.",
  },
];

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

function formatTasteSection(
  label: string,
  values: Array<string | undefined | null>
) {
  const filtered = values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (filtered.length === 0) return `${label}: none supplied`;
  return `${label}: ${filtered.join(" • ")}`;
}

function buildTasteAwareVariantPrompt(args: {
  prompt: string;
  tasteProfile: TasteProfile | null;
  referenceUrls: string[];
  strategy: VariantStrategy;
}) {
  const { prompt, tasteProfile, referenceUrls, strategy } = args;
  const referenceNote =
    referenceUrls.length > 0
      ? `Reference set size: ${referenceUrls.length} visual references informed this direction.`
      : "Reference set size: no reference URLs were attached to this request.";

  if (!tasteProfile) {
    return [
      `Base brief: ${prompt}`,
      `Variant strategy: ${strategy.label} (${strategy.key}).`,
      strategy.note,
      referenceNote,
      "No explicit taste profile was provided. Use the design tokens as the primary style signal while still producing a full, coherent landing page direction.",
    ].join("\n");
  }

  const doNotList =
    tasteProfile.avoid.length > 0
      ? tasteProfile.avoid.map((item) => `- ${item}`).join("\n")
      : "- Do not fall back to generic SaaS landing page tropes";

  return [
    `Base brief: ${prompt}`,
    `Variant strategy: ${strategy.label} (${strategy.key}).`,
    strategy.note,
    referenceNote,
    "",
    "Taste profile:",
    `Summary: ${tasteProfile.summary}`,
    formatTasteSection("Adjectives", tasteProfile.adjectives),
    formatTasteSection("Layout preferences", [
      `density: ${tasteProfile.layoutBias.density}`,
      `grid style: ${tasteProfile.layoutBias.gridStyle}`,
      `whitespace: ${tasteProfile.layoutBias.whitespacePreference}`,
      `hero style: ${tasteProfile.layoutBias.heroStyle}`,
    ]),
    formatTasteSection("Typography traits", [
      `heading mood: ${tasteProfile.typographyTraits.headingMood}`,
      `body mood: ${tasteProfile.typographyTraits.bodyMood}`,
      `scale: ${tasteProfile.typographyTraits.scale}`,
      ...tasteProfile.typographyTraits.suggestedPairings.map(
        (pairing) => `pairing: ${pairing}`
      ),
    ]),
    formatTasteSection("Color behavior", [
      ...tasteProfile.colorBehavior.palette.map((color) => `palette: ${color}`),
      `dominant mood: ${tasteProfile.colorBehavior.dominantMood}`,
      `contrast: ${tasteProfile.colorBehavior.contrast}`,
      `background preference: ${tasteProfile.colorBehavior.backgroundPreference}`,
    ]),
    formatTasteSection("Image treatment", [
      `style: ${tasteProfile.imageTreatment.style}`,
      `mood: ${tasteProfile.imageTreatment.mood}`,
      `corners: ${tasteProfile.imageTreatment.corners}`,
      `overlays: ${tasteProfile.imageTreatment.overlays}`,
    ]),
    `CTA tone: ${tasteProfile.ctaTone}`,
    `Confidence: ${Math.round(tasteProfile.confidence * 100)}%`,
    "",
    "Generation rule:",
    "Generate a full landing-page direction whose layout, pacing, typography, spacing, imagery treatment, and CTA behavior naturally express the taste profile. Do not only map the palette; reflect the profile in structure and hierarchy too.",
    "",
    "DO NOT:",
    doNotList,
  ].join("\n");
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
      tasteProfile,
      referenceUrls,
    } = body as {
      prompt: string;
      tokens: DesignSystemTokens;
      sectionId?: SectionId;
      existingSections?: string;
      mode?: "single" | "variants";
      siteType?: SiteType;
      siteName?: string;
      tasteProfile?: TasteProfile | null;
      referenceUrls?: string[];
    };

    if (!prompt || !tokens) {
      return NextResponse.json(
        { error: "Prompt and design tokens are required" },
        { status: 400 }
      );
    }

    if (mode === "variants") {
      const resolvedSiteName = siteName || inferSiteName(prompt);
      const baseVariants = createVariantSet(
        prompt,
        tokens,
        siteType ?? "auto",
        resolvedSiteName,
        tasteProfile ?? null
      );
      const variants = baseVariants.map((variant, index) => {
        const strategy = VARIANT_STRATEGIES[index] ?? VARIANT_STRATEGIES[0];
        const sourcePrompt = buildTasteAwareVariantPrompt({
          prompt,
          tasteProfile: tasteProfile ?? null,
          referenceUrls: Array.isArray(referenceUrls) ? referenceUrls : [],
          strategy,
        });
        const emphasizedAspect =
          strategy.key === "safe"
            ? tasteProfile?.layoutBias.whitespacePreference ||
              tasteProfile?.typographyTraits.headingMood ||
              "taste alignment"
            : strategy.key === "creative"
            ? tasteProfile?.imageTreatment.style ||
              tasteProfile?.layoutBias.heroStyle ||
              "creative interpretation"
            : tasteProfile?.layoutBias.gridStyle ||
              tasteProfile?.colorBehavior.backgroundPreference ||
              "layout contrast";

        return {
          ...variant,
          name: `${strategy.label} — ${variant.name}`,
          sourcePrompt,
          description: `This variant emphasizes ${emphasizedAspect} from your references.`,
          previewImage: createVariantPreviewImage(variant.name, tokens),
          compiledCode: compilePageTreeToTSX(
            variant.pageTree,
            tokens,
            variant.name.replace(/\s+/g, "")
          ),
        };
      });

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
