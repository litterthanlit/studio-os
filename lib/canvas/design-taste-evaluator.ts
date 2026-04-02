import type { TasteProfile } from "@/types/taste-profile";
import type { DesignNode } from "./design-node";
import { walkDesignTree } from "./design-node";
import { callModel, GEMINI_FLASH, SONNET_4_6, imageUrlBlock } from "@/lib/ai/model-router";

// ─── Types ──────────────────────────────────────────────────────────────────

export type { TasteFidelityScore } from "./taste-evaluator";
import type { TasteFidelityScore } from "./taste-evaluator";

// ─── DesignTree Summarizer ───────────────────────────────────────────────────

interface DesignSectionInfo {
  name: string;
  id: string;
  node: DesignNode;
  paddingTop?: number;
  paddingBottom?: number;
  children: DesignNode[];
}

export function summarizeDesignTree(tree: DesignNode, tasteProfile?: TasteProfile): string {
  const colors = new Set<string>();
  const fonts = new Set<string>();
  const sections: DesignSectionInfo[] = [];

  // ── Walk entire tree for colors + fonts ──────────────────────────────
  walkDesignTree(tree, (node) => {
    if (node.style?.background) colors.add(node.style.background);
    if (node.style?.foreground) colors.add(node.style.foreground);
    if (node.style?.accent) colors.add(node.style.accent);
    if (node.style?.muted) colors.add(node.style.muted);
    if (node.style?.borderColor) colors.add(node.style.borderColor);
    if (node.style?.fontFamily) fonts.add(node.style.fontFamily);
  });

  // ── Collect top-level frame children of root as sections ─────────────
  const rootChildren = tree.children ?? [];
  for (const child of rootChildren) {
    if (child.type === "frame") {
      sections.push({
        name: child.name || "",
        id: child.id,
        node: child,
        paddingTop: child.style?.padding?.top,
        paddingBottom: child.style?.padding?.bottom,
        children: child.children ?? [],
      });
    }
  }

  // ── Section order ─────────────────────────────────────────────────────
  const sectionOrder = sections.map((s) => {
    const label = s.name || s.id;
    const childCount = s.children.length;
    const details: string[] = [];
    const paddingY = ((s.paddingTop ?? 0) + (s.paddingBottom ?? 0)) / 2;
    if (paddingY > 0) details.push(`paddingY≈${Math.round(paddingY)}`);
    if (childCount > 0) details.push(`${childCount} children`);
    const height = s.node.style?.height;
    if (typeof height === "number" && height > 500) details.push("tall");
    if (s.node.style?.coverImage) details.push("coverImage");
    return `${label}${details.length ? ` (${details.join(", ")})` : ""}`;
  });

  // ── Structural pattern detection (style-based) ────────────────────────
  const patterns: string[] = [];

  for (const section of sections) {
    const sectionNode = section.node;
    const children = section.children;
    const childCount = children.length;

    // cover-image section
    if (sectionNode.style?.coverImage) {
      patterns.push(`${section.name || section.id}: cover-image section (editorial photo background)`);
    }

    // grid layout detection
    if (sectionNode.style?.display === "grid") {
      const template = sectionNode.style?.gridTemplate ?? "unknown";
      patterns.push(`${section.name || section.id}: grid layout (${childCount} children, template: ${template})`);
    }

    // pullquote: single large italic text child
    if (childCount === 1) {
      const only = children[0];
      if (
        only.type === "text" &&
        only.style?.fontSize !== undefined &&
        only.style.fontSize >= 24 &&
        only.style?.fontStyle === "italic"
      ) {
        patterns.push(`${section.name || section.id}: pullquote pattern (large italic standalone text, fontSize=${only.style.fontSize})`);
      }
    }

    // card-grid: grid with 3+ structurally uniform children
    if (sectionNode.style?.display === "grid" && childCount >= 3) {
      const childTypes = children.map((c) => c.type);
      const uniqueChildTypes = new Set(childTypes);
      const hasUniformChildren = uniqueChildTypes.size <= 2;
      if (hasUniformChildren) {
        patterns.push(`${section.name || section.id}: card-grid pattern (${childCount} uniform children of type ${[...uniqueChildTypes].join("/")})`);
      }
    }

    // stats/metrics: flex row with 3+ numeric text children
    if (sectionNode.style?.display === "flex" && sectionNode.style?.flexDirection === "row") {
      const numericTextChildren = children.filter((c) => {
        const text = c.content?.text ?? "";
        return c.type === "text" && /^\d[\d%$kmb.,+\-\s]*$/i.test(text.trim());
      });
      if (numericTextChildren.length >= 3) {
        patterns.push(`${section.name || section.id}: stats/metrics pattern (${numericTextChildren.length} numeric text items)`);
      }
    }

    // logo-bar: flex row with 4+ image children
    if (sectionNode.style?.display === "flex" && sectionNode.style?.flexDirection === "row") {
      const imageChildren = children.filter((c) => c.type === "image");
      if (imageChildren.length >= 4) {
        patterns.push(`${section.name || section.id}: logo-bar pattern (${imageChildren.length} image items in a row)`);
      }
    }
  }

  // ── Composition summary ───────────────────────────────────────────────
  const avgPadding =
    sections.length > 0
      ? Math.round(
          sections.reduce((sum, s) => {
            const paddingY = ((s.paddingTop ?? 0) + (s.paddingBottom ?? 0)) / 2;
            return sum + paddingY;
          }, 0) / sections.length
        )
      : 0;

  const avgChildren =
    sections.length > 0
      ? Math.round(
          (sections.reduce((sum, s) => sum + s.children.length, 0) / sections.length) * 10
        ) / 10
      : 0;

  const allSectionNames = sections.map((s) => (s.name || s.id).toLowerCase());
  const uniqueSectionTypes = new Set(allSectionNames);

  const childCounts = sections.map((s) => s.children.length);
  const maxChildDelta =
    childCounts.length > 1 ? Math.max(...childCounts) - Math.min(...childCounts) : 0;
  const isAsymmetric = maxChildDelta > 3;

  // Alternating backgrounds
  const sectionBgs = sections.map((s) => s.node.style?.background).filter(Boolean);
  const uniqueBackgrounds = new Set(sectionBgs);
  const hasAlternatingBgs = uniqueBackgrounds.size >= 2;

  // ── Avoid-list leak detection ─────────────────────────────────────────
  const avoidLeaks: string[] = [];
  const avoidList = tasteProfile?.avoid ?? [];

  for (const avoidItem of avoidList) {
    const lower = avoidItem.toLowerCase();

    if ((lower.includes("card") && lower.includes("grid")) || lower.includes("card-grid")) {
      if (patterns.some((p) => p.includes("card-grid"))) {
        avoidLeaks.push(`AVOID VIOLATION: "${avoidItem}" but card-grid pattern detected`);
      }
    }
    if (lower.includes("pricing")) {
      if (
        sections.some((s) => (s.name || s.id).toLowerCase().includes("pricing")) ||
        patterns.some((p) => p.includes("pricing"))
      ) {
        avoidLeaks.push(`AVOID VIOLATION: "${avoidItem}" but pricing section present`);
      }
    }
    if (lower.includes("stats") || lower.includes("metric")) {
      if (patterns.some((p) => p.includes("stats") || p.includes("metric"))) {
        avoidLeaks.push(`AVOID VIOLATION: "${avoidItem}" but stats/metrics pattern detected`);
      }
    }
    if (lower.includes("logo") && lower.includes("bar")) {
      if (patterns.some((p) => p.includes("logo-bar"))) {
        avoidLeaks.push(`AVOID VIOLATION: "${avoidItem}" but logo-bar detected`);
      }
    }
    if (lower.includes("pill") || lower.includes("rounded")) {
      walkDesignTree(tree, (n) => {
        if (n.type === "button" && n.style?.borderRadius && n.style.borderRadius > 20) {
          avoidLeaks.push(
            `AVOID VIOLATION: "${avoidItem}" but pill button found (radius ${n.style.borderRadius})`
          );
        }
      });
    }
    if (lower.includes("testimonial")) {
      if (
        sections.some((s) => (s.name || s.id).toLowerCase().includes("testimonial")) ||
        patterns.some((p) => p.includes("testimonial"))
      ) {
        avoidLeaks.push(`AVOID VIOLATION: "${avoidItem}" but testimonial section present`);
      }
    }
    if (lower.includes("feature") && lower.includes("grid")) {
      if (patterns.some((p) => p.includes("feature-grid"))) {
        avoidLeaks.push(`AVOID VIOLATION: "${avoidItem}" but feature-grid present`);
      }
    }
  }

  // ── Assemble summary ──────────────────────────────────────────────────
  const lines: string[] = [
    `Colors used: ${[...colors].join(", ") || "none extracted"}`,
    `Fonts used: ${[...fonts].join(", ") || "none extracted"}`,
    ``,
    `Section order (${sections.length} total): ${sectionOrder.join(" → ")}`,
    `Average section paddingY: ${avgPadding}px`,
    `Average children per section: ${avgChildren}`,
    `Unique section types: ${[...uniqueSectionTypes].join(", ")}`,
    `Layout symmetry: ${isAsymmetric ? "asymmetric (varied section sizes)" : "symmetric (similar section sizes)"}`,
    `Background alternation: ${hasAlternatingBgs ? "yes (alternating section backgrounds)" : "no (uniform backgrounds)"}`,
    `Node model: DesignNode V6 (5 types: frame, text, image, button, divider)`,
  ];

  if (patterns.length > 0) {
    lines.push(``);
    lines.push(`STRUCTURAL PATTERNS DETECTED:`);
    lines.push(...patterns.map((p) => `  - ${p}`));
  }

  if (avoidLeaks.length > 0) {
    lines.push(``);
    lines.push(...avoidLeaks);
  }

  return lines.join("\n");
}

// ─── Real-time Scoring ──────────────────────────────────────────────────────

/**
 * Lightweight JSON-based scoring. Sends DesignNode summary + TasteProfile
 * to Gemini Flash. Runs on every generation. Cost: ~$0.005.
 */
export async function scoreDesignRealtimeFidelity(
  tree: DesignNode,
  tasteProfile: TasteProfile
): Promise<TasteFidelityScore> {
  const treeSummary = summarizeDesignTree(tree, tasteProfile);

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
- Section flow: ${tasteProfile.layoutBias.sectionFlow}
- Grid behavior: ${tasteProfile.layoutBias.gridBehavior}
- Layout rhythm: ${tasteProfile.layoutBias.rhythm}
- Image treatment: ${tasteProfile.imageTreatment.style}
- Image sizing: ${tasteProfile.imageTreatment.sizing}
- Corner radius: ${tasteProfile.imageTreatment.cornerRadius}
- CTA style: ${tasteProfile.ctaTone.style}, shape: ${tasteProfile.ctaTone.shape}
- Dominant reference type: ${tasteProfile.dominantReferenceType}
- Avoid: ${tasteProfile.avoid.join(", ") || "none"}

GENERATED DESIGN SUMMARY:
${treeSummary}

Rate each dimension 0-10:

1. PALETTE: Do the colors match the taste profile's palette and temperature?

2. TYPOGRAPHY: Do the fonts match the taste profile's type direction?

3. DENSITY: Does the spacing match the taste profile's density and whitespace intent?

4. STRUCTURE: Does the page structure match the archetype's expected patterns?
   - If archetype is editorial-brand but the page has card grids, stats rows, and pricing tables → score LOW (2-3)
   - If archetype is premium-saas but the page has editorial spreads and pullquotes → score LOW
   - Check whether avoid-list items leaked into the structure (see AVOID VIOLATION lines)
   - A page with the right colors but wrong structure should score LOW on this dimension
   - Weight section types and patterns heavily: a generic SaaS template with editorial colors is NOT editorial

5. OVERALL: Does this design feel aligned with the taste profile's archetype and mood?
   - Weight structure heavily — a SaaS template with editorial colors is NOT editorial
   - A design that matches archetype structurally but has minor color issues should score higher than one with perfect colors and wrong structure

Return ONLY valid JSON:
{"palette":N,"typography":N,"density":N,"structure":N,"overall":N,"justification":"one sentence"}`;

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
    structure: number;
    overall: number;
    justification: string;
  };

  return {
    palette: clampScore(scores.palette),
    typography: clampScore(scores.typography),
    density: clampScore(scores.density),
    structure: clampScore(scores.structure),
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
export async function scoreDesignBenchmarkFidelity(
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
- Section flow: ${tasteProfile.layoutBias.sectionFlow}
- Image treatment: ${tasteProfile.imageTreatment.style}
- Dominant reference type: ${tasteProfile.dominantReferenceType}
- Avoid: ${tasteProfile.avoid.join(", ") || "none"}

Rate each dimension 0-10:

1. PALETTE ADHERENCE: Do the generated colors match the reference palette and color mood?
   (10 = exact match, 0 = completely unrelated colors)

2. TYPOGRAPHY MATCH: Does the heading/body type style match the reference direction?
   (serif for serif, geometric for geometric, editorial for editorial)

3. DENSITY MATCH: Is the spacing, padding, and visual density consistent with the references?
   (generous whitespace vs dense layouts, section heights, content packing)

4. STRUCTURE MATCH: Does the page structure match the archetype's expected patterns?
   - If archetype is editorial-brand but the page has card grids, stats rows, and pricing tables → score LOW (2-3)
   - If archetype is premium-saas but the page has editorial spreads and pullquotes → score LOW
   - A page with the right colors but wrong structure should score LOW on this dimension
   - Compare the structural composition visible in the generated output against the references

5. OVERALL TASTE FIDELITY: Does this design feel like it belongs with the references?
   - Weight structure heavily — a SaaS template with editorial colors is NOT editorial
   - A design that matches archetype structurally but has minor color issues should score higher than one with perfect colors and wrong structure

Return ONLY valid JSON:
{"palette":N,"typography":N,"density":N,"structure":N,"overall":N,"justification":"brief explanation"}`;

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
    structure: number;
    overall: number;
    justification: string;
  };

  return {
    palette: clampScore(scores.palette),
    typography: clampScore(scores.typography),
    density: clampScore(scores.density),
    structure: clampScore(scores.structure),
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
