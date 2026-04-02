import { NextRequest, NextResponse } from "next/server";
import { getRouter, SONNET_4_6, imageUrlBlock } from "@/lib/ai/model-router";
import { scoreImagesBatch } from "@/lib/ai/image-scorer";
import type { TasteProfile } from "@/types/taste-profile";
// Skill context is now inlined — no file system reads needed

type CachedTasteProfile = {
  signature: string;
  profile: TasteProfile;
};

type TasteExtractBody = {
  projectId?: string;
  referenceUrls?: string[];
  existingTokens?: unknown;
  prompt?: string;
};

const tasteCache = new Map<string, CachedTasteProfile>();

// Bump this whenever getSkillContext() changes — forces cache invalidation
const TASTE_CONTEXT_VERSION = 3;

// ── Inline skill context (condensed — previously loaded 10+ markdown files at ~700K tokens) ──

function getSkillContext(): string {
  return `## Archetypes

premium-saas:
  Description: Polished product-focused design built around structured grids and clear hierarchy. Restrained accent palette (blue/purple/green), dense-but-breathing spacing, product mockups as hero imagery. Used by SaaS companies, dev tools, analytics platforms, fintech dashboards.
  Section patterns: Product hero (screenshot or mockup centered), feature card grids (icon+title+desc), social proof bar (logo strip), metrics/stats row, testimonials (quotes + avatars), pricing table, CTA section, minimal footer. Does NOT typically have: full-bleed photography, editorial spreads, asymmetric text/image layouts, artistic or experimental navigation.
  Default avoid: Full-bleed lifestyle photography sections, asymmetric editorial grids, oversized serif display type, poster-style layouts, decorative or artistic imagery unrelated to product.
  Detection signals: Product screenshots or UI mockups as hero imagery, structured 3-4 column feature grids, blue/purple/green accent on neutral background, badge-style proof elements (logos, trust indicators), pricing comparison tables.
  Failure modes: Model uses correct tokens but applies editorial or portfolio layout structure. Product screenshots get treated as decorative imagery. Feature sections become freeform instead of grid-structured.

editorial-brand:
  Description: Magazine-inspired editorial design. Serif/sans contrast, asymmetric grids, dramatic whitespace, photography-dominant. Used by fashion magazines, cultural publications, design studios, and luxury brands with editorial voice.
  Section patterns: Full-bleed photography sections, editorial spreads (text + image asymmetric), pullquote/breakout sections, minimal nav, large-scale typography headers, narrative scroll sequences. Does NOT typically have: feature card grids, stats/metric rows, pricing tables, icon rows, logo bars, structured 3-column layouts.
  Default avoid: 3-column card grids, icon+title+description feature blocks, stats sections with big numbers, SaaS-style pricing tables, centered paragraph text under centered headlines.
  Detection signals: Oversized serif headlines, full-bleed photography, asymmetric text/image layouts, restrained color (1-2 accent colors max), generous vertical whitespace between sections, magazine-like pacing.
  Failure modes: Model defaults to SaaS template (hero → features → proof → pricing → CTA) and applies editorial colors/fonts. The STRUCTURE must change, not just the paint. Card grids are the most common leak.

minimal-tech:
  Description: Monochrome or near-monochrome design with oversized type and product-led restraint. Dark mode common. Developer and technical audience. Single-product focus with generous negative space. Used by developer tools, AI companies, infrastructure startups, open-source projects.
  Section patterns: Text-dominant hero with product screenshot below fold, single-feature deep dives (not grids), code/terminal snippets, minimal social proof (small logo row or none), technical documentation-style sections. Does NOT typically have: lifestyle photography, testimonial carousels, multi-card pricing, warm color accents, decorative imagery.
  Default avoid: Warm lifestyle photography, multi-color accent palettes, rounded bubbly UI elements, testimonial cards with headshots, marketing-speak copy style, decorative gradients.
  Detection signals: Dark backgrounds, monospace or geometric sans-serif type, terminal/code aesthetics, single-product focus, high-contrast text on dark, minimal navigation, restrained to 1-2 colors total.
  Failure modes: Model adds too many sections and colorful accents, turning it into a standard SaaS page. Minimal-tech needs LESS — fewer sections, fewer colors, more negative space, more technical tone.

creative-portfolio:
  Description: Experimental, identity-first design that breaks conventional grid systems. Mixed media, strong personal branding, non-standard navigation, artistic photography. Used by designers, artists, creative agencies, photographers, and studios showcasing creative work.
  Section patterns: Custom hero (often non-standard — full-screen image, video, animation placeholder), project showcases (large imagery with minimal text), about/bio sections, process/approach narratives, contact as experience. Does NOT typically have: feature grids, pricing tables, SaaS-style testimonials, stats rows, standardized card layouts.
  Default avoid: Standardized SaaS feature grids, uniform card layouts, corporate testimonial sections, pricing tables, cookie-cutter hero patterns, stock photography.
  Detection signals: Unusual grid breaking or overlapping elements, mixed media (photo + illustration + type), strong personal or studio branding, artistic photography, non-standard navigation (side nav, hidden nav, unconventional placement), portfolio case study layouts.
  Failure modes: Model produces a clean corporate site and adds one quirky element. Portfolio sites need STRUCTURAL experimentation — layout breaking, unconventional flow, showcase-first hierarchy — not just an unusual font choice.

culture-brand:
  Description: Warm, human, community-focused design with lifestyle imagery and approachable tone. Earth tones and warm palettes. Rounded, friendly shapes. People-first photography. Used by wellness brands, community platforms, food/beverage, lifestyle brands, non-profits, education.
  Section patterns: Lifestyle hero (people/community imagery), mission/values sections, community stories or testimonials with real photos, team/people sections, warm CTA with inclusive language, curated imagery grids. Does NOT typically have: technical feature grids, dark mode, code snippets, product mockup heroes, aggressive pricing tables.
  Default avoid: Dark/cold color schemes, technical jargon, aggressive sales CTAs, stock business photography, monochrome palettes, angular/sharp UI elements, developer-focused aesthetics.
  Detection signals: Warm photography featuring people, earth tones (terracotta, sage, cream, ochre), rounded corners and soft shapes, community/people imagery, warm sans-serif typography, generous padding with organic feel.
  Failure modes: Model uses warm colors but keeps SaaS structure. Culture brands need WARMTH in structure too — people-first imagery, story-driven sections, community feel. Not just orange on a feature grid.

experimental:
  Description: Rule-breaking avant-garde design with bold contrast, extreme typography, and unconventional navigation. Visual noise as intentional texture. Used by art institutions, experimental studios, fashion-forward brands, music labels, creative agencies pushing boundaries.
  Section patterns: Non-standard hero (overlapping elements, extreme type scale, unconventional composition), sections that break the container, mixed-direction layouts, interactive or scroll-triggered sections, minimal or hidden navigation. Does NOT typically have: standard grids, conventional hero patterns, pricing tables, structured feature lists, corporate proof sections.
  Default avoid: Conventional grid systems, standard navigation patterns, conservative typography, predictable section ordering, uniform spacing, safe color combinations, corporate tone.
  Detection signals: Overlapping elements, extreme type sizes (200px+ headlines), unconventional navigation (no visible nav, side-scrolling, hidden menus), visual noise or texture as design element, high-contrast color collisions, mixed type directions.
  Failure modes: Model plays it safe with a slightly edgy color scheme on a standard layout. Experimental needs STRUCTURAL rule-breaking — overlapping, breaking containers, extreme scale shifts, unconventional flow. A dark background with a bold font is not experimental.

## Structural Vocabulary

editorial-spread: asymmetric text/image layout — NOT a card grid
pullquote: large-scale quotation used as a section break or visual pause
full-bleed: edge-to-edge imagery or background, no container padding
feature-grid: structured cards with icon+title+desc — a SaaS pattern
proof-bar: horizontal logo strip showing client/partner logos — a SaaS pattern
stats-row: big numbers in a row showing metrics — a SaaS pattern
narrative-scroll: long-form vertical storytelling with alternating content blocks
showcase-grid: large imagery with minimal text overlay — a portfolio pattern
deep-dive: single-feature focused section with detail — a minimal-tech pattern

## Layout Vocabulary

section-flow = narrative|modular|alternating|stacked|overlapping|interlocking|editorial-grid
composition = symmetric|asymmetric|editorial-grid|broken-grid
imagery-role = dominant|supporting|accent|absent
density = spacious|balanced|dense
rhythm = uniform|alternating|progressive|asymmetric
hero = full-bleed|split|text-dominant|contained|media-dominant
grid = strict|fluid|broken|editorial
whitespace = breathing|structural|dramatic|minimal`;
}

// ── System prompt ───────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  return `You are the Taste Engine for Studio OS — a reference-informed design intelligence system.

Your job is to analyze visual references and produce a structured TasteProfile JSON that drives website generation. You have deep knowledge of design archetypes, typography systems, color behavior, and layout patterns.

## Rules

1. Identify the primary archetype from: premium-saas, editorial-brand, minimal-tech, creative-portfolio, culture-brand, experimental
2. Be specific and opinionated — generic output ("modern", "clean", "professional") is a failure
3. Provide REAL hex color values derived from analyzing the references, not defaults or placeholders
4. Recommend specific font pairings by name (e.g., "Inter + Newsreader"), never generic families
5. Include at least 5 specific, actionable items in avoid[]
6. Set confidence based on reference count and coherence — never default to high confidence
7. Non-web references (photography, posters, art) inform MOOD and TREATMENT, not literal layout
8. If references are incoherent, set confidence low and list conflicts in warnings[]
9. adjectives must be specific to this project — "modern", "clean", "professional" are banned
10. archetypeConfidence of 1.0 is almost never correct — cap at 0.92 unless you have 10+ coherent references
11. Keep the JSON concise and compact. No extra whitespace-heavy prose.
12. summary must be 1 sentence. warnings max 3. recommendedPairings max 2. avoid exactly 5 items.
13. avoid[] MUST include archetype-specific anti-patterns from the archetype's "Default avoid" list, not just generic items like "clutter" or "bad contrast"
14. sectionFlow and rhythm MUST reflect the archetype's typical section patterns — editorial-brand uses "editorial-grid" or "overlapping", NOT "stacked"; premium-saas uses "stacked" or "modular", NOT "editorial-grid"
15. imageTreatment.style MUST be specific to the archetype — "editorial" for editorial-brand, "product" for premium-saas, "atmospheric" for culture-brand, "minimal" for minimal-tech, "abstract" for experimental
16. dominantReferenceType MUST be set based on what the references actually show (ui-screenshot, photography, poster, art, mixed), NOT defaulted to "ui-screenshot"

${getSkillContext()}

## CRITICAL: Archetype Disambiguation

premium-saas is ONLY for references that show software products — feature grids, pricing tables, product mockups, dashboard UIs, SaaS landing pages. It is NOT the default for "well-designed" or "polished" sites.

If references show oversized serif type + full-bleed photography + asymmetric layouts + restrained palettes → editorial-brand, NOT premium-saas.
If references show product screenshots + feature cards + pricing tables → premium-saas.
If references show people/lifestyle photography + warm tones + rounded elements → culture-brand.
If references show dark backgrounds + monospace type + terminal aesthetics → minimal-tech.
If references show artistic photography + unusual grids + portfolio showcases → creative-portfolio.
If references show overlapping elements + extreme type scale + broken containers → experimental.

When in doubt between editorial-brand and premium-saas, ask: do the references show PRODUCTS/SOFTWARE or STORIES/PHOTOGRAPHY? Products → premium-saas. Stories/photography → editorial-brand.

A beautifully designed magazine spread is editorial-brand, not premium-saas. A fashion lookbook is editorial-brand, not premium-saas. An art-directed brand site with large photography is editorial-brand, not premium-saas.

## CRITICAL: Ignore Scorer Bias

The "Scored image summary" below is from a generic image quality scorer. Its style/mood/tag labels do NOT map to archetypes. Treat the scorer's labels as supplementary metadata only. Base your archetype classification primarily on what you SEE in the actual images, using the Detection signals above.

Respond ONLY with valid JSON matching the TasteProfile schema. No markdown, no explanation, just JSON.`;
}

function summarizeExistingTokens(existingTokens: unknown) {
  if (!existingTokens || typeof existingTokens !== "object") return null;
  const tokens = existingTokens as {
    colors?: Record<string, string>;
    typography?: { fontFamily?: string };
  };

  return {
    colors: tokens.colors
      ? {
          background: tokens.colors.background,
          surface: tokens.colors.surface,
          text: tokens.colors.text,
          accent: tokens.colors.accent,
          primary: tokens.colors.primary,
        }
      : undefined,
    fontFamily: tokens.typography?.fontFamily,
  };
}

// ── Prompt-aware archetype boosting ──────────────────────────────────────────
function detectPromptArchetypeHints(prompt: string | undefined): string {
  if (!prompt) return "";
  const lower = prompt.toLowerCase();
  const hints: string[] = [];

  if (/\b(editorial|magazine|publication|fashion|lookbook|spread|vogue|harper)\b/.test(lower)) {
    hints.push("STRONG SIGNAL: The user's prompt mentions editorial/magazine/fashion concepts. This strongly suggests editorial-brand archetype. Do NOT classify as premium-saas.");
  }
  if (/\b(saas|software|product|dashboard|app|platform|pricing)\b/.test(lower)) {
    hints.push("STRONG SIGNAL: The user's prompt mentions SaaS/software/product concepts. This strongly suggests premium-saas archetype.");
  }
  if (/\b(portfolio|agency|studio|creative|showcase|case.?stud)\b/.test(lower)) {
    hints.push("STRONG SIGNAL: The user's prompt mentions portfolio/agency/studio concepts. This strongly suggests creative-portfolio archetype.");
  }
  if (/\b(wellness|community|lifestyle|organic|sustainable|nonprofit|education)\b/.test(lower)) {
    hints.push("STRONG SIGNAL: The user's prompt mentions wellness/community/lifestyle concepts. This strongly suggests culture-brand archetype.");
  }
  if (/\b(developer|terminal|cli|api|infrastructure|open.?source|devtool)\b/.test(lower)) {
    hints.push("STRONG SIGNAL: The user's prompt mentions developer/technical concepts. This strongly suggests minimal-tech archetype.");
  }
  if (/\b(experimental|avant.?garde|art\s+institution|boundary|radical|deconstructed)\b/.test(lower)) {
    hints.push("STRONG SIGNAL: The user's prompt mentions experimental/avant-garde concepts. This strongly suggests experimental archetype.");
  }

  return hints.length > 0
    ? `\n\nPROMPT ARCHETYPE SIGNALS (from user's own description of what they want):\n${hints.join("\n")}`
    : "";
}

// Analyze scored image data for archetype signals the scorer may have captured
// without knowing it (e.g., tags like "serif", "photography", "fashion")
function inferArchetypeHintsFromScores(
  scoredImages: Array<{ tags: string[]; style: string; mood: string }>
): string {
  const allTags = scoredImages.flatMap((img) => img.tags.map((t) => t.toLowerCase()));
  const allStyles = scoredImages.map((img) => img.style.toLowerCase());
  const allMoods = scoredImages.map((img) => img.mood.toLowerCase());
  const combined = [...allTags, ...allStyles, ...allMoods];

  const editorialSignals = combined.filter((t) =>
    /editorial|magazine|fashion|serif|photography|luxury|elegant|dramatic|asymmetric|spread|minimal.?nav/.test(t)
  ).length;
  const saasSignals = combined.filter((t) =>
    /saas|product|dashboard|software|feature|pricing|tech|startup|grid|ui|interface|mockup/.test(t)
  ).length;
  const portfolioSignals = combined.filter((t) =>
    /portfolio|showcase|artistic|creative|experimental|mixed.?media|gallery/.test(t)
  ).length;

  const hints: string[] = [];
  if (editorialSignals >= 3 && editorialSignals > saasSignals) {
    hints.push(`Image scorer detected ${editorialSignals} editorial signals (${combined.filter((t) => /editorial|magazine|fashion|serif|photography|luxury|elegant|dramatic/.test(t)).slice(0, 5).join(", ")}). This aligns with editorial-brand, NOT premium-saas.`);
  }
  if (portfolioSignals >= 3 && portfolioSignals > saasSignals) {
    hints.push(`Image scorer detected ${portfolioSignals} portfolio/creative signals. This aligns with creative-portfolio.`);
  }

  return hints.length > 0
    ? `\nSCORER-DERIVED ARCHETYPE HINTS:\n${hints.join("\n")}`
    : "";
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b)
  );
  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

function buildSignature(referenceUrls: string[], existingTokens?: unknown) {
  return stableStringify({
    contextVersion: TASTE_CONTEXT_VERSION,
    referenceUrls: [...referenceUrls].sort(),
    existingTokens: existingTokens ?? null,
  });
}

function computeConfidence(
  referenceCount: number,
  scores: Array<{ scores: { overall: number }; style: string; mood: string }>
) {
  const countScore = referenceCount >= 6 ? 0.34 : referenceCount >= 3 ? 0.26 : 0.16;
  const averageOverall =
    scores.length > 0
      ? scores.reduce((sum, item) => sum + item.scores.overall, 0) / scores.length
      : 55;
  const qualityScore = Math.max(0.18, Math.min(0.38, (averageOverall / 100) * 0.38));

  const styleCounts = new Map<string, number>();
  const moodCounts = new Map<string, number>();
  for (const item of scores) {
    styleCounts.set(item.style, (styleCounts.get(item.style) ?? 0) + 1);
    moodCounts.set(item.mood, (moodCounts.get(item.mood) ?? 0) + 1);
  }

  const dominantStyle = Math.max(...Array.from(styleCounts.values()), 1);
  const dominantMood = Math.max(...Array.from(moodCounts.values()), 1);
  const styleConsistency = dominantStyle / Math.max(scores.length, 1);
  const moodConsistency = dominantMood / Math.max(scores.length, 1);
  const consistencyScore = Math.max(
    0.16,
    Math.min(0.28, ((styleConsistency + moodConsistency) / 2) * 0.28)
  );

  return Math.max(
    0,
    Math.min(1, Number((countScore + qualityScore + consistencyScore).toFixed(2)))
  );
}

function fallbackTasteProfile(confidence = 0.42): TasteProfile {
  // Generic fallback — intentionally neutral, not biased toward any archetype.
  // Archetype-specific defaults in ARCHETYPE_DEFAULTS handle the gap-filling
  // when Sonnet classifies correctly but omits some fields.
  return {
    summary:
      "Direction could not be fully determined from references. Using neutral defaults — refine by adding more references or adjusting taste settings.",
    adjectives: ["intentional", "structured", "considered", "restrained"],
    archetypeMatch: "minimal-tech",
    archetypeConfidence: confidence,
    layoutBias: {
      density: "balanced",
      rhythm: "alternating",
      heroStyle: "contained",
      sectionFlow: "stacked",
      gridBehavior: "fluid",
      whitespaceIntent: "breathing",
    },
    typographyTraits: {
      scale: "expanded",
      headingTone: "geometric",
      bodyTone: "neutral",
      contrast: "high",
      casePreference: "mixed",
      recommendedPairings: ["Inter + Inter", "Space Grotesk + DM Sans"],
    },
    colorBehavior: {
      mode: "light",
      palette: "neutral-plus-accent",
      accentStrategy: "single-pop",
      saturation: "muted",
      temperature: "neutral",
      suggestedColors: {
        background: "#FAFAFA",
        surface: "#F5F5F5",
        text: "#111111",
        accent: "#3B5EFC",
        secondary: "#E8E8E8",
      },
    },
    imageTreatment: {
      style: "minimal",
      sizing: "contained",
      treatment: "raw",
      cornerRadius: "subtle",
      borders: false,
      shadow: "none",
      aspectPreference: "landscape",
    },
    ctaTone: {
      style: "understated",
      shape: "sharp",
      hierarchy: "primary-dominant",
    },
    avoid: [
      "generic gradients",
      "overcrowded sections",
      "random accent colors",
      "stock photography of people using laptops",
      "blue-purple startup color palette",
    ],
    confidence,
    referenceCount: 0,
    dominantReferenceType: "mixed",
    warnings: ["Low reference count — profile may lack specificity"],
  };
}

// ── Archetype-aware defaults ─────────────────────────────────────────────────
// When Sonnet returns an archetype but omits some fields, fill gaps from
// archetype-appropriate defaults instead of the SaaS fallback.

const ARCHETYPE_DEFAULTS: Record<string, {
  layoutBias: Partial<TasteProfile["layoutBias"]>;
  imageTreatment: Partial<TasteProfile["imageTreatment"]>;
  typographyTraits: Partial<TasteProfile["typographyTraits"]>;
  ctaTone: Partial<TasteProfile["ctaTone"]>;
  colorBehavior: Partial<TasteProfile["colorBehavior"]>;
}> = {
  "editorial-brand": {
    layoutBias: {
      density: "spacious",
      rhythm: "asymmetric",
      heroStyle: "full-bleed",
      sectionFlow: "editorial-grid",
      gridBehavior: "editorial",
      whitespaceIntent: "dramatic",
    },
    imageTreatment: {
      style: "editorial",
      sizing: "full-bleed",
      treatment: "raw",
      cornerRadius: "none",
      borders: false,
      shadow: "none",
      aspectPreference: "mixed",
    },
    typographyTraits: {
      scale: "dramatic",
      headingTone: "editorial",
      bodyTone: "literary",
      contrast: "extreme",
      casePreference: "mixed",
    },
    ctaTone: {
      style: "editorial",
      shape: "sharp",
      hierarchy: "text-link-preferred",
    },
    colorBehavior: {
      mode: "mixed",
      palette: "restrained",
      accentStrategy: "no-accent",
      saturation: "muted",
      temperature: "neutral",
    },
  },
  "creative-portfolio": {
    layoutBias: {
      density: "spacious",
      rhythm: "asymmetric",
      heroStyle: "media-dominant",
      sectionFlow: "editorial-grid",
      gridBehavior: "broken",
      whitespaceIntent: "dramatic",
    },
    imageTreatment: {
      style: "editorial",
      sizing: "mixed",
      treatment: "raw",
      cornerRadius: "none",
      borders: false,
      shadow: "none",
      aspectPreference: "mixed",
    },
    typographyTraits: {
      scale: "expanded",
      headingTone: "display",
      bodyTone: "neutral",
      contrast: "high",
      casePreference: "mixed",
    },
    ctaTone: {
      style: "understated",
      shape: "sharp",
      hierarchy: "text-link-preferred",
    },
    colorBehavior: {
      mode: "dark",
      palette: "monochromatic",
      accentStrategy: "single-pop",
      saturation: "muted",
      temperature: "cool",
    },
  },
  "experimental": {
    layoutBias: {
      density: "dense",
      rhythm: "asymmetric",
      heroStyle: "text-dominant",
      sectionFlow: "interlocking",
      gridBehavior: "broken",
      whitespaceIntent: "structural",
    },
    imageTreatment: {
      style: "abstract",
      sizing: "mixed",
      treatment: "high-contrast",
      cornerRadius: "none",
      borders: false,
      shadow: "none",
      aspectPreference: "mixed",
    },
    typographyTraits: {
      scale: "dramatic",
      headingTone: "display",
      bodyTone: "technical",
      contrast: "extreme",
      casePreference: "all-uppercase",
    },
    ctaTone: {
      style: "bold",
      shape: "sharp",
      hierarchy: "primary-dominant",
    },
    colorBehavior: {
      mode: "dark",
      palette: "monochromatic",
      accentStrategy: "single-pop",
      saturation: "vivid",
      temperature: "cool",
    },
  },
  "culture-brand": {
    layoutBias: {
      density: "balanced",
      rhythm: "alternating",
      heroStyle: "full-bleed",
      sectionFlow: "stacked",
      gridBehavior: "fluid",
      whitespaceIntent: "breathing",
    },
    imageTreatment: {
      style: "documentary",
      sizing: "full-bleed",
      treatment: "raw",
      cornerRadius: "subtle",
      borders: false,
      shadow: "subtle",
      aspectPreference: "landscape",
    },
    typographyTraits: {
      scale: "expanded",
      headingTone: "humanist",
      bodyTone: "warm",
      contrast: "medium",
      casePreference: "mixed",
    },
    ctaTone: {
      style: "understated",
      shape: "rounded",
      hierarchy: "balanced",
    },
    colorBehavior: {
      mode: "light",
      palette: "analogous",
      accentStrategy: "single-pop",
      saturation: "moderate",
      temperature: "warm",
    },
  },
  "minimal-tech": {
    layoutBias: {
      density: "spacious",
      rhythm: "uniform",
      heroStyle: "text-dominant",
      sectionFlow: "stacked",
      gridBehavior: "strict",
      whitespaceIntent: "structural",
    },
    imageTreatment: {
      style: "product",
      sizing: "contained",
      treatment: "raw",
      cornerRadius: "subtle",
      borders: false,
      shadow: "none",
      aspectPreference: "landscape",
    },
    typographyTraits: {
      scale: "expanded",
      headingTone: "geometric",
      bodyTone: "neutral",
      contrast: "high",
      casePreference: "mixed",
    },
    ctaTone: {
      style: "technical",
      shape: "sharp",
      hierarchy: "primary-dominant",
    },
    colorBehavior: {
      mode: "light",
      palette: "monochromatic",
      accentStrategy: "single-pop",
      saturation: "desaturated",
      temperature: "cool",
    },
  },
};

function normalizeTasteProfile(
  raw: Partial<TasteProfile>,
  fallback: TasteProfile,
  confidence: number
): TasteProfile {
  // Use archetype-aware defaults when available, otherwise fall back to generic
  const archetype = raw.archetypeMatch ?? fallback.archetypeMatch;
  const archetypeDefaults = ARCHETYPE_DEFAULTS[archetype];

  // Helper: pick from raw → archetype default → generic fallback
  const pick = <T>(rawVal: T | undefined, archetypeVal: T | undefined, fallbackVal: T): T =>
    rawVal ?? archetypeVal ?? fallbackVal;

  const layoutBias: TasteProfile["layoutBias"] = {
    density: pick(raw.layoutBias?.density, archetypeDefaults?.layoutBias?.density, fallback.layoutBias.density),
    rhythm: pick(raw.layoutBias?.rhythm, archetypeDefaults?.layoutBias?.rhythm, fallback.layoutBias.rhythm),
    heroStyle: pick(raw.layoutBias?.heroStyle, archetypeDefaults?.layoutBias?.heroStyle, fallback.layoutBias.heroStyle),
    sectionFlow: pick(raw.layoutBias?.sectionFlow, archetypeDefaults?.layoutBias?.sectionFlow, fallback.layoutBias.sectionFlow),
    gridBehavior: pick(raw.layoutBias?.gridBehavior, archetypeDefaults?.layoutBias?.gridBehavior, fallback.layoutBias.gridBehavior),
    whitespaceIntent: pick(raw.layoutBias?.whitespaceIntent, archetypeDefaults?.layoutBias?.whitespaceIntent, fallback.layoutBias.whitespaceIntent),
  };

  const typographyTraits: TasteProfile["typographyTraits"] = {
    scale: pick(raw.typographyTraits?.scale, archetypeDefaults?.typographyTraits?.scale, fallback.typographyTraits.scale),
    headingTone: pick(raw.typographyTraits?.headingTone, archetypeDefaults?.typographyTraits?.headingTone, fallback.typographyTraits.headingTone),
    bodyTone: pick(raw.typographyTraits?.bodyTone, archetypeDefaults?.typographyTraits?.bodyTone, fallback.typographyTraits.bodyTone),
    contrast: pick(raw.typographyTraits?.contrast, archetypeDefaults?.typographyTraits?.contrast, fallback.typographyTraits.contrast),
    casePreference: pick(raw.typographyTraits?.casePreference, archetypeDefaults?.typographyTraits?.casePreference, fallback.typographyTraits.casePreference),
    recommendedPairings:
      raw.typographyTraits?.recommendedPairings?.length
        ? raw.typographyTraits.recommendedPairings
        : fallback.typographyTraits.recommendedPairings,
  };

  const colorBehavior: TasteProfile["colorBehavior"] = {
    mode: pick(raw.colorBehavior?.mode, archetypeDefaults?.colorBehavior?.mode, fallback.colorBehavior.mode),
    palette: pick(raw.colorBehavior?.palette, archetypeDefaults?.colorBehavior?.palette, fallback.colorBehavior.palette),
    accentStrategy: pick(raw.colorBehavior?.accentStrategy, archetypeDefaults?.colorBehavior?.accentStrategy, fallback.colorBehavior.accentStrategy),
    saturation: pick(raw.colorBehavior?.saturation, archetypeDefaults?.colorBehavior?.saturation, fallback.colorBehavior.saturation),
    temperature: pick(raw.colorBehavior?.temperature, archetypeDefaults?.colorBehavior?.temperature, fallback.colorBehavior.temperature),
    suggestedColors: {
      background:
        raw.colorBehavior?.suggestedColors?.background ??
        fallback.colorBehavior.suggestedColors.background,
      surface:
        raw.colorBehavior?.suggestedColors?.surface ??
        fallback.colorBehavior.suggestedColors.surface,
      text:
        raw.colorBehavior?.suggestedColors?.text ??
        fallback.colorBehavior.suggestedColors.text,
      accent:
        raw.colorBehavior?.suggestedColors?.accent ??
        fallback.colorBehavior.suggestedColors.accent,
      secondary:
        raw.colorBehavior?.suggestedColors?.secondary ??
        fallback.colorBehavior.suggestedColors.secondary,
    },
  };

  const imageTreatment: TasteProfile["imageTreatment"] = {
    style: pick(raw.imageTreatment?.style, archetypeDefaults?.imageTreatment?.style, fallback.imageTreatment.style),
    sizing: pick(raw.imageTreatment?.sizing, archetypeDefaults?.imageTreatment?.sizing, fallback.imageTreatment.sizing),
    treatment: pick(raw.imageTreatment?.treatment, archetypeDefaults?.imageTreatment?.treatment, fallback.imageTreatment.treatment),
    cornerRadius: pick(raw.imageTreatment?.cornerRadius, archetypeDefaults?.imageTreatment?.cornerRadius, fallback.imageTreatment.cornerRadius),
    borders: raw.imageTreatment?.borders ?? archetypeDefaults?.imageTreatment?.borders ?? fallback.imageTreatment.borders,
    shadow: pick(raw.imageTreatment?.shadow, archetypeDefaults?.imageTreatment?.shadow, fallback.imageTreatment.shadow),
    aspectPreference: pick(raw.imageTreatment?.aspectPreference, archetypeDefaults?.imageTreatment?.aspectPreference, fallback.imageTreatment.aspectPreference),
  };

  const ctaTone: TasteProfile["ctaTone"] = {
    style: pick(raw.ctaTone?.style, archetypeDefaults?.ctaTone?.style, fallback.ctaTone.style),
    shape: pick(raw.ctaTone?.shape, archetypeDefaults?.ctaTone?.shape, fallback.ctaTone.shape),
    hierarchy: pick(raw.ctaTone?.hierarchy, archetypeDefaults?.ctaTone?.hierarchy, fallback.ctaTone.hierarchy),
  };

  return {
    summary: raw.summary ?? fallback.summary,
    adjectives: raw.adjectives?.length ? raw.adjectives : fallback.adjectives,
    archetypeMatch: raw.archetypeMatch ?? fallback.archetypeMatch,
    archetypeConfidence:
      typeof raw.archetypeConfidence === "number"
        ? Math.max(0, Math.min(0.92, raw.archetypeConfidence))
        : fallback.archetypeConfidence,
    secondaryArchetype: raw.secondaryArchetype,
    layoutBias,
    typographyTraits,
    colorBehavior,
    imageTreatment,
    ctaTone,
    avoid: raw.avoid?.length ? raw.avoid : fallback.avoid,
    confidence:
      typeof raw.confidence === "number"
        ? Math.max(0, Math.min(1, raw.confidence))
        : confidence,
    referenceCount:
      typeof raw.referenceCount === "number" ? raw.referenceCount : fallback.referenceCount,
    dominantReferenceType: raw.dominantReferenceType ?? fallback.dominantReferenceType,
    warnings: raw.warnings ?? [],
  };
}

// ── Route ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  console.log("[taste/extract] OPENROUTER_API_KEY present:", !!process.env.OPENROUTER_API_KEY);
  console.log("[TASTE DEBUG] Context version:", TASTE_CONTEXT_VERSION);
  console.log("[TASTE DEBUG] Skill context length:", getSkillContext().length, "chars");
  try {
    const body = (await req.json()) as TasteExtractBody;
    const projectId = body.projectId?.trim();
    const referenceUrls = (body.referenceUrls ?? []).filter(Boolean);
    const existingTokens = body.existingTokens ?? null;
    const userPrompt = body.prompt?.trim() || undefined;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    if (referenceUrls.length === 0) {
      return NextResponse.json({ error: "referenceUrls are required" }, { status: 400 });
    }

    const signature = buildSignature(referenceUrls, existingTokens);
    const cached = tasteCache.get(projectId);
    console.log("[TASTE DEBUG] Cache check:", "project=" + projectId, "hit:", !!(cached && cached.signature === signature), "cacheExists:", !!cached, "sigMatch:", cached ? cached.signature === signature : "N/A");
    if (cached && cached.signature === signature) {
      console.log("[TASTE DEBUG] Returning CACHED profile for project:", projectId, "archetype:", cached.profile.archetypeMatch);
      return NextResponse.json(cached.profile);
    }
    console.log("[TASTE DEBUG] Cache MISS — running fresh extraction for project:", projectId);

    const scoredMap = await scoreImagesBatch(
      referenceUrls.map((url, index) => ({ id: `${index}`, url })),
      { delayMs: 0 }
    );
    const scoredImages = referenceUrls.map((url, index) => ({
      url,
      ...(scoredMap.get(`${index}`) ?? {
        scores: { composition: 65, color: 65, mood: 65, uniqueness: 65, overall: 65 },
        tags: ["curated", "reference"],
        colors: [],
        mood: "refined",
        style: "editorial",
        reasoning: "Fallback analysis used.",
      }),
    }));

    const derivedConfidence = computeConfidence(referenceUrls.length, scoredImages);
    const fallback = fallbackTasteProfile(derivedConfidence);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      tasteCache.set(projectId, { signature, profile: fallback });
      return NextResponse.json(fallback);
    }

    const router = getRouter();

    const imageContent = referenceUrls.slice(0, 5).map((url) => imageUrlBlock(url));

    // Strip URLs from scored data to avoid sending base64 data as text
    // (the images are already sent as vision blocks below)
    const scoredSummary = scoredImages.map((img, i) => ({
      index: i,
      scores: img.scores,
      tags: img.tags,
      colors: img.colors,
      mood: img.mood,
      style: img.style,
    }));

    const existingTokenSummary = summarizeExistingTokens(existingTokens);

    // Build prompt-aware archetype hints
    const promptHints = detectPromptArchetypeHints(userPrompt);
    const scorerHints = inferArchetypeHintsFromScores(scoredImages);

    const systemPrompt = buildSystemPrompt();

    const userMessageText = `Analyze these ${referenceUrls.length} visual references and return a compact TasteProfile JSON.

IMPORTANT: Base your archetype classification primarily on what you SEE in the images. The scored image summary below is from a generic quality scorer — its style/mood labels are NOT archetype classifications. Look at the actual images.

Project ID: ${projectId}
Reference count: ${referenceUrls.length}
${userPrompt ? `User prompt: "${userPrompt}"` : ""}

Scored image summary (generic quality scores — do NOT use style/mood fields for archetype classification):
${JSON.stringify(scoredSummary)}
${scorerHints}
${promptHints}

${existingTokenSummary ? `Existing token summary:\n${JSON.stringify(existingTokenSummary)}` : "No existing tokens."}

Return compact JSON only. Do not pretty-print. Fill every field, but keep strings tight and specific.`;

    // ── Debug logging ──────────────────────────────────────────────
    console.log("[TASTE DEBUG] System prompt length:", systemPrompt.length, "chars");
    console.log("[TASTE DEBUG] Contains editorial-brand:", systemPrompt.includes("editorial-brand"));
    console.log("[TASTE DEBUG] Contains detection signals:", systemPrompt.includes("Detection signals"));
    console.log("[TASTE DEBUG] Contains disambiguation:", systemPrompt.includes("Archetype Disambiguation"));
    console.log("[TASTE DEBUG] Contains scorer bias warning:", systemPrompt.includes("Ignore Scorer Bias"));
    console.log("[TASTE DEBUG] User prompt received:", userPrompt ?? "(none)");
    console.log("[TASTE DEBUG] Prompt archetype hints:", promptHints || "(none)");
    console.log("[TASTE DEBUG] Scorer-derived hints:", scorerHints || "(none)");
    console.log("[TASTE DEBUG] Image count sent to Sonnet:", imageContent.length);
    console.log("[TASTE DEBUG] User message text (no images):", userMessageText.substring(0, 2000));
    console.log(
      `[taste/extract] Calling Sonnet 4.6 with ${Math.min(
        referenceUrls.length,
        5
      )} images, system prompt ~${systemPrompt.length} chars`
    );

    const response = await router.chat.completions.create({
      model: SONNET_4_6,
      max_tokens: 2600,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userMessageText,
            },
            ...imageContent,
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const finishReason = response.choices[0]?.finish_reason;
    console.log(`[taste/extract] Sonnet responded: ${text.length} chars, finish_reason: ${finishReason}`);

    if (finishReason === "length") {
      console.warn("[taste/extract] Sonnet hit max_tokens — response likely truncated");
    }

    let raw: Partial<TasteProfile> = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        raw = JSON.parse(jsonMatch[0]) as Partial<TasteProfile>;
      } else {
        console.error("[taste/extract] No JSON found in response. First 300 chars:", text.slice(0, 300));
      }
    } catch (parseErr) {
      console.error("[taste/extract] JSON parse failed:", parseErr instanceof Error ? parseErr.message : parseErr);
      console.error("[taste/extract] Response tail (last 200 chars):", text.slice(-200));
      // Fall through to normalization with empty raw — will use fallback values
    }

    console.log("[TASTE DEBUG] Raw model archetype:", raw.archetypeMatch ?? "(missing)", "confidence:", raw.archetypeConfidence ?? "(missing)");
    console.log("[TASTE DEBUG] Raw model sectionFlow:", raw.layoutBias?.sectionFlow ?? "(missing)", "imageTreatment:", raw.imageTreatment?.style ?? "(missing)");

    const profile = normalizeTasteProfile(raw, fallback, derivedConfidence);

    console.log("[TASTE DEBUG] Final archetype:", profile.archetypeMatch, "confidence:", profile.archetypeConfidence);
    console.log("[TASTE DEBUG] Avoid list:", JSON.stringify(profile.avoid));
    console.log("[TASTE DEBUG] Section flow:", profile.layoutBias?.sectionFlow, "| hero:", profile.layoutBias?.heroStyle, "| density:", profile.layoutBias?.density);
    console.log("[TASTE DEBUG] Image treatment style:", profile.imageTreatment?.style, "| sizing:", profile.imageTreatment?.sizing);
    console.log("[TASTE DEBUG] Adjectives:", profile.adjectives?.join(", "));

    tasteCache.set(projectId, { signature, profile });
    return NextResponse.json(profile);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Taste profile extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
