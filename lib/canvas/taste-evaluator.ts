import type { TasteProfile } from "@/types/taste-profile";
import type { PageNode } from "./compose";
import { callModel, GEMINI_FLASH, SONNET_4_6, imageUrlBlock } from "@/lib/ai/model-router";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TasteFidelityScore {
  palette: number;       // 0-10
  typography: number;    // 0-10
  density: number;       // 0-10
  layout: number;        // 0-10
  overall: number;       // 0-10
  justification: string;
  mode: "realtime" | "benchmark";
  timestamp: string;
}

// ─── PageTree Summarizer ────────────────────────────────────────────────────

function summarizePageTree(pageTree: PageNode): string {
  const colors = new Set<string>();
  const fonts = new Set<string>();
  const sections: { type: string; paddingY?: number; children?: number }[] = [];

  function walk(node: PageNode) {
    if (node.style?.background) colors.add(node.style.background);
    if (node.style?.foreground) colors.add(node.style.foreground);
    if (node.style?.accent) colors.add(node.style.accent);
    if (node.style?.muted) colors.add(node.style.muted);
    if (node.style?.borderColor) colors.add(node.style.borderColor);

    if (node.style?.fontFamily) fonts.add(node.style.fontFamily);

    if (node.type === "section") {
      sections.push({
        type: node.name || node.id,
        paddingY: node.style?.paddingY,
        children: node.children?.length,
      });
    }

    node.children?.forEach(walk);
  }

  walk(pageTree);

  const avgPadding = sections.length > 0
    ? Math.round(sections.reduce((sum, s) => sum + (s.paddingY ?? 0), 0) / sections.length)
    : 0;

  return [
    `Colors used: ${[...colors].join(", ") || "none extracted"}`,
    `Fonts used: ${[...fonts].join(", ") || "none extracted"}`,
    `Sections (${sections.length}):`,
    ...sections.map(s => `  - ${s.type}: paddingY=${s.paddingY ?? "unset"}, children=${s.children ?? 0}`),
    `Average section paddingY: ${avgPadding}px`,
  ].join("\n");
}

// ─── Real-time Scoring ──────────────────────────────────────────────────────

/**
 * Lightweight JSON-based scoring. Sends PageNode summary + TasteProfile
 * to Gemini Flash. Runs on every generation. Cost: ~$0.005.
 */
export async function scoreRealtimeFidelity(
  pageTree: PageNode,
  tasteProfile: TasteProfile
): Promise<TasteFidelityScore> {
  const treeSummary = summarizePageTree(pageTree);

  const suggestedColors = tasteProfile.colorBehavior.suggestedColors;
  const paletteColors = [
    suggestedColors.background,
    suggestedColors.surface,
    suggestedColors.text,
    suggestedColors.accent,
    suggestedColors.secondary,
  ].filter(Boolean).join(", ");

  const prompt = `You are evaluating whether a generated website design aligns with an extracted taste profile.

TASTE PROFILE:
- Archetype: ${tasteProfile.archetypeMatch}
- Adjectives: ${tasteProfile.adjectives.join(", ")}
- Color mode: ${tasteProfile.colorBehavior.mode}
- Palette colors: ${paletteColors}
- Palette strategy: ${tasteProfile.colorBehavior.palette}
- Temperature: ${tasteProfile.colorBehavior.temperature}
- Typography: heading tone=${tasteProfile.typographyTraits.headingTone}, body tone=${tasteProfile.typographyTraits.bodyTone}
- Recommended fonts: ${tasteProfile.typographyTraits.recommendedPairings.join(", ")}
- Type scale: ${tasteProfile.typographyTraits.scale}, contrast: ${tasteProfile.typographyTraits.contrast}
- Density: ${tasteProfile.layoutBias.density}
- Whitespace: ${tasteProfile.layoutBias.whitespaceIntent}
- Hero style: ${tasteProfile.layoutBias.heroStyle}
- Corner radius: ${tasteProfile.imageTreatment.cornerRadius}
- CTA style: ${tasteProfile.ctaTone.style}, shape: ${tasteProfile.ctaTone.shape}
- Avoid: ${tasteProfile.avoid.join(", ") || "none"}

GENERATED DESIGN SUMMARY:
${treeSummary}

Rate each dimension 0-10:
1. PALETTE: Do the colors match the taste profile's palette and temperature?
2. TYPOGRAPHY: Do the fonts match the taste profile's type direction?
3. DENSITY: Does the spacing match the taste profile's density and whitespace intent?
4. LAYOUT: Is the page structure coherent and professional?
5. OVERALL: Does this design feel aligned with the taste profile's archetype and mood?

Return ONLY valid JSON:
{"palette":N,"typography":N,"density":N,"layout":N,"overall":N,"justification":"one sentence"}`;

  const raw = await callModel({
    model: GEMINI_FLASH,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 200,
    temperature: 0.2,
    jsonMode: true,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in scoring response");
  }

  const scores = JSON.parse(jsonMatch[0]) as {
    palette: number;
    typography: number;
    density: number;
    layout: number;
    overall: number;
    justification: string;
  };

  return {
    palette: clampScore(scores.palette),
    typography: clampScore(scores.typography),
    density: clampScore(scores.density),
    layout: clampScore(scores.layout),
    overall: clampScore(scores.overall),
    justification: scores.justification || "",
    mode: "realtime",
    timestamp: new Date().toISOString(),
  };
}

// ─── Benchmark Scoring ──────────────────────────────────────────────────────

/**
 * High-accuracy screenshot-based scoring. Sends reference images +
 * generated screenshot to Claude Vision. Cost: ~$0.05.
 * Used offline for benchmark evaluation.
 */
export async function scoreBenchmarkFidelity(
  referenceImageUrls: string[],
  generatedScreenshotUrl: string,
  tasteProfile: TasteProfile
): Promise<TasteFidelityScore> {
  const prompt = `You are evaluating a generated website design against reference images that represent the desired taste and style direction.

REFERENCE IMAGES: [See attached images 1-${referenceImageUrls.length}]
GENERATED OUTPUT: [See last attached image]

The taste profile extracted from the references describes:
- Archetype: ${tasteProfile.archetypeMatch}
- Mood: ${tasteProfile.adjectives.join(", ")}
- Palette direction: ${tasteProfile.colorBehavior.mode}, ${tasteProfile.colorBehavior.temperature}
- Typography direction: ${tasteProfile.typographyTraits.headingTone} headings, ${tasteProfile.typographyTraits.bodyTone} body
- Density: ${tasteProfile.layoutBias.density}, whitespace: ${tasteProfile.layoutBias.whitespaceIntent}

Rate each dimension 0-10:

1. PALETTE ADHERENCE: Do the generated colors match the reference palette and color mood?
   (10 = exact match, 0 = completely unrelated colors)

2. TYPOGRAPHY MATCH: Does the heading/body type style match the reference direction?
   (serif for serif, geometric for geometric, editorial for editorial)

3. DENSITY MATCH: Is the spacing, padding, and visual density consistent with the references?
   (generous whitespace vs dense layouts, section heights, content packing)

4. LAYOUT COHERENCE: Does the page have clear visual hierarchy and professional structure?
   (distinct sections, logical flow, sophisticated composition)

5. OVERALL TASTE FIDELITY: Does this design feel like it belongs with the references?
   (the gestalt impression — would a designer say these are from the same design family?)

Return ONLY valid JSON:
{"palette":N,"typography":N,"density":N,"layout":N,"overall":N,"justification":"brief explanation"}`;

  const imageBlocks = [
    ...referenceImageUrls.map(url => imageUrlBlock(url, "low")),
    imageUrlBlock(generatedScreenshotUrl, "low"),
  ];

  const raw = await callModel({
    model: SONNET_4_6,
    messages: [{
      role: "user",
      content: [
        ...imageBlocks,
        { type: "text", text: prompt },
      ],
    }],
    maxTokens: 300,
    temperature: 0.2,
    jsonMode: true,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in benchmark scoring response");
  }

  const scores = JSON.parse(jsonMatch[0]) as {
    palette: number;
    typography: number;
    density: number;
    layout: number;
    overall: number;
    justification: string;
  };

  return {
    palette: clampScore(scores.palette),
    typography: clampScore(scores.typography),
    density: clampScore(scores.density),
    layout: clampScore(scores.layout),
    overall: clampScore(scores.overall),
    justification: scores.justification || "",
    mode: "benchmark",
    timestamp: new Date().toISOString(),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clampScore(n: unknown): number {
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(10, Math.round(num * 10) / 10));
}
