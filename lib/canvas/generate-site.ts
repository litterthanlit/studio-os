import type { DesignSystemTokens } from "./generate-system";
import type { TasteProfile } from "@/types/taste-profile";
import type { PageNode } from "./compose";
import { compileTasteToDirectives, directivesToPromptText, type CompiledDirectives, type FidelityMode } from "./directive-compiler";
import { getArchetypeBannedNodeTypes } from "./archetype-bans";

// Re-export for external consumers
export { getArchetypeBannedNodeTypes } from "./archetype-bans";

// ─── Section Schema ──────────────────────────────────────────────────────────

export const SECTION_ORDER = [
  "nav",
  "hero",
  "social-proof",
  "features",
  "how-it-works",
  "testimonials",
  "pricing",
  "cta",
  "footer",
] as const;

export type SectionId = (typeof SECTION_ORDER)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  nav: "Navigation",
  hero: "Hero",
  "social-proof": "Social Proof",
  features: "Features",
  "how-it-works": "How It Works",
  testimonials: "Testimonials",
  pricing: "Pricing",
  cta: "CTA",
  footer: "Footer",
};

// ─── Variant Mode Type ──────────────────────────────────────────────────────
export type VariantMode = "safe" | "creative" | "alternative";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GeneratedSite = {
  code: string;
  name: string;
  description: string;
  sections: SectionId[];
};

// ─── CSS Variable Map ────────────────────────────────────────────────────────

function tokensToCSSVarBlock(tokens: DesignSystemTokens): string {
  return `
CSS Variables available on :root (use var(--xxx) in inline styles):
  --color-primary: ${tokens.colors.primary}
  --color-secondary: ${tokens.colors.secondary}
  --color-accent: ${tokens.colors.accent}
  --color-background: ${tokens.colors.background}
  --color-surface: ${tokens.colors.surface}
  --color-text: ${tokens.colors.text}
  --color-text-muted: ${tokens.colors.textMuted}
  --color-border: ${tokens.colors.border}
  --font-heading: ${tokens.typography.fontFamily}
  --font-body: ${tokens.typography.fontFamily}
  --font-xs: ${tokens.typography.scale.xs}
  --font-sm: ${tokens.typography.scale.sm}
  --font-base: ${tokens.typography.scale.base}
  --font-lg: ${tokens.typography.scale.lg}
  --font-xl: ${tokens.typography.scale.xl}
  --font-2xl: ${tokens.typography.scale["2xl"]}
  --font-3xl: ${tokens.typography.scale["3xl"]}
  --font-4xl: ${tokens.typography.scale["4xl"]}
  --space-xs: ${tokens.spacing.scale["1"]}
  --space-sm: ${tokens.spacing.scale["2"]}
  --space-md: ${tokens.spacing.scale["4"]}
  --space-lg: ${tokens.spacing.scale["8"]}
  --space-xl: ${tokens.spacing.scale["12"]}
  --space-2xl: ${tokens.spacing.scale["16"]}
  --radius-sm: ${tokens.radii.sm}
  --radius-md: ${tokens.radii.md}
  --radius-lg: ${tokens.radii.lg}
  --radius-xl: ${tokens.radii.xl}
  --shadow-sm: ${tokens.shadows.sm}
  --shadow-md: ${tokens.shadows.md}
  --shadow-lg: ${tokens.shadows.lg}
`.trim();
}

// ─── Taste Rubric ────────────────────────────────────────────────────────────

const TASTE_RUBRIC = `
## Taste Rubric — evaluate EVERY section before returning

You are a senior product designer generating a production-ready site.
Evaluate your output against these criteria. If any fails, regenerate that section.

1. **Whitespace**: Generous, intentional negative space. Sections need
   at least 80–120px vertical padding. Never crowd elements.
2. **Typography**: Clear hierarchy — max 3 font sizes per section.
   Headlines large and bold, body text comfortable reading size, labels small and muted.
3. **Color**: Max 3 colors per section, used with purpose.
   Background + text + one accent. Never rainbow.
4. **Motion**: Subtle fade-in and stagger only. Use whileInView with
   opacity 0→1 and y 20→0. No bounce, no scale, no rotate. Gentle.
5. **Alignment**: Consistent grid, nothing floats randomly.
   Use maxWidth containers (1200px). Center-align sections.
   Left-align text within cards.
`.trim();

// ─── Archetype Section Grammar ──────────────────────────────────────────────
// Archetype-specific structural guidance that overrides the default SaaS section
// skeleton. Injected early in the prompt so the model sees it before any default
// section list. Works with existing PageNode types — tells the model HOW to
// compose sections differently, not to use new types.

function getArchetypeSectionGrammar(archetype: string | undefined): string {
  switch (archetype) {
    case "editorial-brand":
      return `
## SECTION GRAMMAR — EDITORIAL

You are generating an EDITORIAL design, NOT a SaaS landing page.

DO NOT USE these SaaS patterns:
- 3-column feature card grids (icon + title + description)
- Stats/metrics rows with big numbers
- Logo bars / social proof strips ("Trusted by...")
- Pricing tables or tier comparisons
- Icon rows or bullet-point feature lists
- "How it works" numbered step sections
- FAQ accordions

## COMPLETE PAGE COMPOSITIONS
Study these two complete editorial homepage compositions. They show how sections flow together into one cohesive page — not how individual sections look in isolation.

### Composition A — Photography-Led Editorial
[{"type":"section","name":"Nav","style":{"paddingX":64,"paddingY":20,"direction":"row","justify":"space-between","align":"center"},"children":[{"type":"heading","content":{"text":"[MAGAZINE NAME]"},"style":{"fontSize":14,"fontWeight":600,"letterSpacing":0.1}},{"type":"paragraph","content":{"text":"Stories  Archive  About"},"style":{"fontSize":13,"opacity":0.6}}]},{"type":"section","name":"Hero","style":{"paddingX":0,"paddingY":0,"minHeight":700,"align":"flex-end","justify":"flex-end"},"content":{"mediaUrl":"photo:editorial fashion photography, dramatic lighting, full frame, high contrast","mediaAlt":"Editorial cover photograph"},"children":[{"type":"heading","content":{"text":"[Bold 3-5 word editorial headline]"},"style":{"fontSize":72,"fontWeight":300,"fontFamily":"[serif]","letterSpacing":-0.03,"foreground":"#FFFFFF","paddingX":64,"paddingY":48}}]},{"type":"section","name":"Editorial Spread","style":{"paddingX":64,"paddingY":96,"direction":"row","gap":64,"align":"flex-start"},"children":[{"type":"heading","content":{"kicker":"FEATURE","text":"[Story headline, 5-8 words]","subtext":"[2-3 sentences of editorial body copy. Specific, evocative, magazine-quality writing.]"},"style":{"fontSize":36,"fontWeight":400,"fontFamily":"[serif]","maxWidth":"50%"}},{"type":"section","name":"spread-image","style":{"minHeight":500},"content":{"mediaUrl":"photo:[specific editorial image matching the story]","mediaAlt":"[descriptive alt]"},"children":[]}]},{"type":"section","name":"Pullquote","style":{"paddingX":120,"paddingY":100,"align":"center","justify":"center","background":"[subtle contrast from previous section]"},"children":[{"type":"heading","content":{"text":"\"[A single powerful editorial statement]\""},"style":{"fontSize":32,"fontWeight":300,"fontFamily":"[serif]","fontStyle":"italic","lineHeight":1.5}},{"type":"paragraph","content":{"text":"— [Attribution, title]"},"style":{"fontSize":13,"opacity":0.5,"paddingY":16}}]},{"type":"section","name":"Story Index","style":{"paddingX":64,"paddingY":80,"gap":0,"direction":"column"},"children":[{"type":"heading","content":{"kicker":"01","text":"[Article title]","subtext":"[Byline — Author Name]"},"style":{"fontSize":24,"fontFamily":"[serif]","paddingY":24,"borderColor":"[subtle border]"}},{"type":"heading","content":{"kicker":"02","text":"[Article title]","subtext":"[Byline — Author Name]"},"style":{"fontSize":24,"fontFamily":"[serif]","paddingY":24,"borderColor":"[subtle border]"}},{"type":"heading","content":{"kicker":"03","text":"[Article title]","subtext":"[Byline — Author Name]"},"style":{"fontSize":24,"fontFamily":"[serif]","paddingY":24}}]},{"type":"section","name":"Footer","style":{"paddingX":64,"paddingY":32,"direction":"row","justify":"space-between","opacity":0.5},"children":[{"type":"paragraph","content":{"text":"© 2026 [Magazine Name]"},"style":{"fontSize":12}},{"type":"paragraph","content":{"text":"Instagram  Twitter  Contact"},"style":{"fontSize":12}}]}]

### Composition B — Typography-Led Editorial
[{"type":"section","name":"Nav","style":{"paddingX":64,"paddingY":20,"direction":"row","justify":"space-between","align":"center"},"children":[{"type":"heading","content":{"text":"[PUBLICATION]"},"style":{"fontSize":14,"fontWeight":600,"letterSpacing":0.1}},{"type":"paragraph","content":{"text":"Issues  About  Subscribe"},"style":{"fontSize":13,"opacity":0.6}}]},{"type":"section","name":"Hero","style":{"paddingX":64,"paddingY":140,"minHeight":600,"background":"[dark or near-black]","foreground":"[light or white]","align":"flex-start","gap":24},"children":[{"type":"paragraph","content":{"kicker":"ISSUE 47 — SPRING 2026"},"style":{"fontSize":11,"letterSpacing":0.12,"opacity":0.5}},{"type":"heading","content":{"text":"[Oversized editorial headline spanning most of the width, 4-8 words]"},"style":{"fontSize":80,"fontWeight":300,"fontFamily":"[serif]","letterSpacing":-0.04,"lineHeight":0.95,"maxWidth":"80%"}},{"type":"paragraph","content":{"text":"[One sentence teaser. Understated.]"},"style":{"fontSize":16,"opacity":0.6,"maxWidth":"40%"}}]},{"type":"section","name":"Full-bleed Photo","style":{"paddingX":0,"paddingY":0,"minHeight":500},"content":{"mediaUrl":"photo:[specific editorial photograph related to the issue theme]","mediaAlt":"[descriptive alt]"},"children":[]},{"type":"section","name":"Two-Column Editorial","style":{"paddingX":64,"paddingY":80,"direction":"row","gap":48},"children":[{"type":"heading","content":{"kicker":"ESSAY","text":"[Column heading]","subtext":"[3-4 sentences of editorial body copy. Real writing, not marketing speak.]"},"style":{"fontSize":28,"fontFamily":"[serif]"}},{"type":"section","name":"col-image","style":{"minHeight":400},"content":{"mediaUrl":"photo:[supporting editorial image]","mediaAlt":"[alt]"},"children":[]}]},{"type":"section","name":"Subscribe","style":{"paddingX":64,"paddingY":48,"align":"center","gap":12},"children":[{"type":"paragraph","content":{"text":"Receive new issues directly."},"style":{"fontSize":14,"opacity":0.6}},{"type":"button-row","children":[{"type":"button","content":{"text":"Subscribe →"},"style":{"fontSize":14,"fontWeight":400,"background":"transparent","foreground":"[text color]","borderColor":"[subtle border]","borderRadius":2}}]}]},{"type":"section","name":"Footer","style":{"paddingX":64,"paddingY":32,"direction":"row","justify":"space-between","opacity":0.4},"children":[{"type":"paragraph","content":{"text":"© 2026 [Publication]"},"style":{"fontSize":12}},{"type":"paragraph","content":{"text":"Privacy  Terms  Contact"},"style":{"fontSize":12}}]}]

Choose the composition that best matches the references and brief, then ADAPT it:
- Replace placeholder text with real editorial copy matching the brief
- Adjust colors to match the taste profile
- Adjust fonts to match the taste profile
- You may add or remove one section, but keep the overall rhythm and pacing
- You may combine elements from both compositions

## PAGE-LEVEL COMPOSITION RULES

These rules govern how sections relate to each other. Following them prevents the "stack of blocks" problem.

1. **VISUAL RHYTHM**: Adjacent sections MUST contrast in visual weight.
   - Image-heavy section → text-led section → image-heavy section
   - Never put two image-heavy sections next to each other
   - Never put two text-heavy sections next to each other

2. **HEIGHT VARIATION**: Sections MUST vary in height.
   - Hero: 600-700px (tallest)
   - Feature spread: 400-500px
   - Pullquote: 200-300px (shortest — a breath)
   - Photo section: 400-600px
   - Footer: minimal (60-80px)
   - NEVER make all sections the same height

3. **WIDTH VARIATION**: Alternate between full-bleed and contained sections.
   - Full-bleed: paddingX=0 (image fills edge to edge)
   - Contained: paddingX=64-120 (text has margins)
   - At least one section should be full-bleed (usually hero or a photo section)

4. **BACKGROUND ALTERNATION**: Use at most 2-3 background colors across the page.
   - Light → dark → light creates dramatic rhythm
   - Don't alternate on every section — group 2-3 sections on the same background, then switch
   - The pullquote or subscribe section is a good place to shift background

5. **CTA TREATMENT**: Editorial sites do NOT have loud colored CTA blocks.
   - Subscribe is a quiet, minimal section — one line of text + one understated button or inline text link
   - NEVER use a full-width colored background for the CTA section
   - NEVER use "Start Free Trial" or "Get Started" language
   - Editorial CTAs: "Subscribe →", "Read the issue", "Join the list"

6. **THE PAGE SHOULD FEEL LIKE ONE DESIGNED ARTIFACT**, not a sequence of independent blocks.
   - Think of the page as a magazine spread that scrolls
   - Each section should feel like it belongs to the next
   - The reader should feel narrative momentum, not "here's another block"

SECTION COUNT: 5-6 sections total. Editorial sites have fewer, larger, more impactful sections. A 9-section template is a SaaS landing page, not a magazine.

COPY TONE: Write like a magazine editor, not a SaaS copywriter. No "supercharge your workflow" or "everything you need." Think: confident, understated, evocative.
`;

    case "minimal-tech":
      return `
## SECTION GRAMMAR — MINIMAL TECH

USE these patterns:
- Product screenshot or hero with one clean product image
- Single-feature deep dives (one feature per section, large image + minimal text)
- Dark mode sections with monospace or geometric type
- Terminal/code aesthetic where appropriate
- Sparse, focused sections with lots of negative space

DO NOT USE:
- Busy feature grids with 6+ items
- Testimonial carousels
- Logo bars
- Pricing tables with 3+ tiers
- Stock photography

SECTION COUNT: 3-5 focused sections. Less is more.
`;

    case "creative-portfolio":
      return `
## SECTION GRAMMAR — CREATIVE PORTFOLIO

USE these patterns:
- Full-bleed project showcases
- Asymmetric or broken-grid layouts
- Mixed media sections (image + text in non-standard arrangements)
- Statement typography (oversized, expressive)
- Personal/identity-driven hero (name, role, one strong image)

DO NOT USE:
- Uniform card grids
- Corporate proof sections
- Pricing or feature comparison tables
- "How it works" flows
- Generic SaaS CTAs

SECTION COUNT: 4-6 sections with strong visual personality.
`;

    case "culture-brand":
      return `
## SECTION GRAMMAR — CULTURE BRAND

USE these patterns:
- Warm, photography-led hero (lifestyle/community imagery)
- Story-driven sections (narrative flow, not feature dumps)
- Community/people sections with real-feeling photography
- Rounded, warm UI elements
- Earth-toned backgrounds with natural texture

DO NOT USE:
- Clinical product screenshots
- Dense feature grids
- Technical/developer-oriented sections
- Dark mode or monochrome palettes
- Sharp, angular design elements

SECTION COUNT: 5-7 sections with warm, human pacing.
`;

    case "experimental":
      return `
## SECTION GRAMMAR — EXPERIMENTAL

USE these patterns:
- Rule-breaking layouts (overlapping elements, unusual positioning)
- Extreme type scale (very large + very small in same section)
- Visual noise or texture as design elements
- Unconventional navigation placement
- Bold color blocking or high-contrast sections

DO NOT USE:
- Safe, centered, symmetric layouts
- Standard SaaS section ordering
- Conservative type sizes
- Muted, corporate color palettes
- Generic stock imagery

SECTION COUNT: 3-6 sections. Break expectations.
`;

    default: // premium-saas or unknown
      return `
## SECTION GRAMMAR — PRODUCT / SAAS

Standard product landing page patterns are appropriate:
- Hero with headline, subtext, CTA
- Feature highlights (cards or sections)
- Social proof (testimonials, logos)
- Pricing (if relevant)
- Final CTA

SECTION COUNT: 5-8 sections. Structured and scannable.
`;
  }
}

// ─── Structural guard for transformation prompts ────────────────────────────

function getArchetypeStructuralGuard(archetype: string | undefined): string {
  switch (archetype) {
    case "editorial-brand":
      return "\nIMPORTANT: This is an editorial design. Do NOT restructure into SaaS patterns (card grids, stats rows, pricing tables). Keep the editorial composition — large photography, asymmetric spreads, pullquotes, and minimal section count (4-6).";
    case "minimal-tech":
      return "\nIMPORTANT: This is a minimal tech design. Do NOT add busy feature grids, testimonial carousels, or logo bars. Keep sections sparse and focused (3-5 total).";
    case "creative-portfolio":
      return "\nIMPORTANT: This is a creative portfolio design. Do NOT restructure into uniform card grids, corporate proof sections, or SaaS CTAs. Keep the visual personality and asymmetric layouts.";
    case "culture-brand":
      return "\nIMPORTANT: This is a culture brand design. Do NOT restructure into clinical product sections or dense feature grids. Keep the warm, story-driven, photography-led composition.";
    case "experimental":
      return "\nIMPORTANT: This is an experimental design. Do NOT normalize into safe, centered, symmetric layouts or standard SaaS section ordering. Keep the rule-breaking composition.";
    default:
      return "";
  }
}

// ─── Variant Layout Directives ──────────────────────────────────────────────
// @deprecated — V5 uses 1+2 derivation (buildPushedVariantPrompt / buildRestructuredVariantPrompt)
// instead of 3 independent generations. Kept for buildPageTreePrompt's base generation.

const VARIANT_DIRECTIVES: Record<VariantMode, string> = {
  safe: `## Variant Strategy: SIGNAL (Safe)
You are generating the **clearest and most reference-faithful** layout.
- Choose the section sequence that best matches the references and brief. Use 5-7 sections total, not a fixed template.
- Prioritize hero, capability/story, showcase, proof, CTA, and footer in whatever order best fits the direction.
- Pricing is OPTIONAL. Only include it when the brief clearly sounds like a pricing-led SaaS page and the references support that pattern.
- Testimonials and logo bars are OPTIONAL. Do not inject them into editorial, product-object, art-forward, or utility-like directions unless they are genuinely helpful.
- Let the references decide whether the hero is centered, split, text-dominant, or media-dominant.
- This is still the safest variant, but "safe" means disciplined and coherent, not generic SaaS boilerplate.
- IMPORTANT: Keep each section concise. Quality over quantity. Do NOT add filler sections.`,

  creative: `## Variant Strategy: ATLAS (Creative)
You are generating a **bold editorial interpretation** that pushes boundaries.
- Lean structure: nav → hero → features → testimonials → CTA → footer
- **NO pricing section, NO social proof logo bar** — this is editorial, not SaaS boilerplate
- **Left-aligned hero** with asymmetric layout (text left, visual/gradient right)
- 2-column feature layout (not 3) — more breathing room, more editorial feel
- Large typography, dramatic whitespace, magazine-like pacing
- Use the accent color more boldly — gradients, accent backgrounds on sections
- Section transitions should feel like turning pages, not scrolling a template`,

  alternative: `## Variant Strategy: MONOGRAPH (Alternative)
You are generating a **trust-first, narrative-driven** layout.
- Structure: nav → hero → testimonials → social proof → features → CTA → footer
- **Testimonials come IMMEDIATELY after hero** — build trust before features
- **NO pricing section** — this is a credibility play
- **Left-aligned hero** with accent-wash background
- Social proof (logo bar) comes before features to establish authority
- Features section should feel like a capabilities overview, not a feature list
- Overall tone: confident, understated, trust-forward`,
};

// ─── Taste Profile → Structured Design Rules ────────────────────────────────

/** @deprecated Use compileTasteToDirectives + directivesToPromptText instead */
function tasteToDesignDirectives(taste: TasteProfile | null | undefined): string {
  if (!taste) return "";

  const lines: string[] = [
    `## Design Directives (from taste profile — confidence: ${Math.round(taste.confidence * 100)}%)`,
    "",
    `**Archetype**: ${taste.archetypeMatch}${taste.secondaryArchetype ? ` (with ${taste.secondaryArchetype} influence)` : ""}`,
    `**Adjectives**: ${taste.adjectives.join(", ")}`,
    "",
    "### Layout Rules",
    `- Density: ${taste.layoutBias.density} — ${taste.layoutBias.density === "spacious" ? "generous padding, lots of negative space between elements" : taste.layoutBias.density === "dense" ? "tighter spacing, more content per viewport" : "balanced padding, standard spacing"}`,
    `- Grid: ${taste.layoutBias.gridBehavior} — ${taste.layoutBias.gridBehavior === "strict" ? "precise column alignment, no overlap" : taste.layoutBias.gridBehavior === "editorial" ? "magazine-style asymmetric grids" : taste.layoutBias.gridBehavior === "broken" ? "intentionally broken grid for visual tension" : "fluid responsive grid"}`,
    `- Whitespace: ${taste.layoutBias.whitespaceIntent} — ${taste.layoutBias.whitespaceIntent === "dramatic" ? "sections with 120-160px vertical padding" : taste.layoutBias.whitespaceIntent === "breathing" ? "generous 100-120px padding" : taste.layoutBias.whitespaceIntent === "structural" ? "whitespace as grid element, 80-120px" : "minimal but intentional, 60-80px"}`,
    `- Hero: ${taste.layoutBias.heroStyle} — ${taste.layoutBias.heroStyle === "full-bleed" ? "edge-to-edge hero, no container constraints" : taste.layoutBias.heroStyle === "split" ? "50/50 text and image/visual split" : taste.layoutBias.heroStyle === "text-dominant" ? "text takes center stage, minimal visuals" : "hero contained within max-width"}`,
    `- Section flow: ${taste.layoutBias.sectionFlow}`,
    "",
    "### Typography Rules",
    `- Heading tone: ${taste.typographyTraits.headingTone} — use this as the personality of all headings`,
    `- Body tone: ${taste.typographyTraits.bodyTone}`,
    `- Scale: ${taste.typographyTraits.scale} — ${taste.typographyTraits.scale === "dramatic" ? "very large headlines (clamp 4-7rem), strong contrast" : taste.typographyTraits.scale === "expanded" ? "large headlines (clamp 3-5rem)" : taste.typographyTraits.scale === "compressed" ? "tighter, more compact typography" : "standard moderate scale"}`,
    `- Contrast: ${taste.typographyTraits.contrast} — ${taste.typographyTraits.contrast === "extreme" ? "massive size difference between heading and body" : taste.typographyTraits.contrast === "high" ? "clear size hierarchy" : "subtle size progression"}`,
    `- Case: ${taste.typographyTraits.casePreference}`,
    "",
    "### Color Rules",
    `- Mode: ${taste.colorBehavior.mode} — ${taste.colorBehavior.mode === "dark" ? "dark backgrounds, light text" : taste.colorBehavior.mode === "light" ? "light backgrounds, dark text" : "mixed light and dark sections"}`,
    `- Palette strategy: ${taste.colorBehavior.palette}`,
    `- Accent: ${taste.colorBehavior.accentStrategy} — ${taste.colorBehavior.accentStrategy === "single-pop" ? "one accent color used sparingly for emphasis" : taste.colorBehavior.accentStrategy === "gradient-bold" ? "bold gradient treatments" : taste.colorBehavior.accentStrategy === "no-accent" ? "no accent color, pure neutral palette" : "subtle accent usage"}`,
    `- Saturation: ${taste.colorBehavior.saturation}`,
    `- Temperature: ${taste.colorBehavior.temperature}`,
    "",
    "### Image & Surface Treatment",
    `- Corner radius: ${taste.imageTreatment.cornerRadius === "none" ? "0px (sharp)" : taste.imageTreatment.cornerRadius === "subtle" ? "4-8px" : taste.imageTreatment.cornerRadius === "rounded" ? "12-20px" : "999px (pill)"}`,
    `- Borders: ${taste.imageTreatment.borders ? "yes, use subtle 1px borders on cards and surfaces" : "no borders, use shadow or spacing to separate elements"}`,
    `- Shadow: ${taste.imageTreatment.shadow}`,
    "",
    "### CTA Style",
    `- Tone: ${taste.ctaTone.style} — ${taste.ctaTone.style === "bold" ? "large, high-contrast buttons with strong presence" : taste.ctaTone.style === "understated" ? "subtle, refined buttons" : taste.ctaTone.style === "editorial" ? "text-link style CTAs, minimal button chrome" : "clean, technical button style"}`,
    `- Shape: ${taste.ctaTone.shape}`,
    "",
    "### AVOID these specifically:",
    ...taste.avoid.map((item) => `- ${item}`),
  ];

  if (taste.warnings.length > 0) {
    lines.push("", "### Warnings:", ...taste.warnings.map((w) => `- ${w}`));
  }

  return lines.join("\n");
}

/** @deprecated Use compileTasteToDirectives + directivesToPromptText instead */
function referenceFidelityRules(tasteProfile: TasteProfile | null | undefined): string {
  const dominantType = tasteProfile?.dominantReferenceType ?? "mixed";
  const mode = tasteProfile?.colorBehavior.mode ?? "adaptive";
  const palette = tasteProfile?.colorBehavior.palette ?? "restrained";
  const imageStyle = tasteProfile?.imageTreatment.style ?? "minimal";

  return [
    "## Reference Fidelity Rules",
    "Treat the references as the primary design authority for composition, pacing, contrast, and interface attitude.",
    "Do not default to startup-site patterns unless the references clearly support them.",
    `Dominant reference type: ${dominantType}.`,
    `Color mode signal: ${mode}. Palette signal: ${palette}. Image treatment signal: ${imageStyle}.`,
    "If the references feel monochrome, restrained, halftone, utilitarian, editorial, or gallery-like, preserve that restraint. Do not inject bright SaaS accents, glossy gradients, or pricing-table boilerplate.",
    "If the references are sparse or object-focused, keep the page sparse. Fewer sections is better than obvious filler.",
    "Every major section should be justifiable from the brief and the references. If a section feels like template residue, remove it.",
  ].join("\n");
}

// ─── Full Site Prompt ────────────────────────────────────────────────────────

export function buildSitePrompt(
  tokens: DesignSystemTokens,
  prompt: string,
  sectionId?: SectionId,
  existingSections?: string,
  options?: {
    variantMode?: VariantMode;
    tasteProfile?: TasteProfile | null;
    fidelityMode?: FidelityMode;
  }
): string {
  const cssVars = tokensToCSSVarBlock(tokens);
  const isPartialRegen = sectionId && existingSections;
  const variantMode = options?.variantMode;
  const tasteProfile = options?.tasteProfile;

  // Variant-specific layout directives (or generic if no mode specified)
  const variantSection = variantMode
    ? VARIANT_DIRECTIVES[variantMode]
    : "";

  // Structured taste directives via the directive compiler
  const compiledDirectives = compileTasteToDirectives(
    tasteProfile,
    options?.fidelityMode ?? "balanced"
  );
  const tasteSection = directivesToPromptText(compiledDirectives);

  const sectionInstructions = isPartialRegen
    ? `
## SECTION-LEVEL REGENERATION
You are regenerating ONLY the "${SECTION_LABELS[sectionId]}" section (id="${sectionId}").
Keep the same function signature: function ${sectionFnName(sectionId)}().
The rest of the page already exists — here is the current code for context:

\`\`\`
${existingSections}
\`\`\`

Return ONLY the single section function. Do NOT return the full page.
`
    : `
## SITE STRUCTURE
Generate a full landing page. ${variantMode ? "Follow the variant strategy above for section order and layout approach." : `Include these sections in order:

1. **NavSection** (id="nav") — Sticky top bar. Logo text placeholder on left,
   3–4 nav links center/right, CTA button far right. Minimal, clean.

2. **HeroSection** (id="hero") — Full-width. Large headline (clamp 3–5rem),
   supporting paragraph, primary CTA button + secondary ghost button.
   Optional subtle background gradient or pattern.

3. **SocialProofSection** (id="social-proof") — Horizontal logo bar.
   6–8 placeholder company name spans in muted text. "Trusted by" label above.

4. **FeaturesSection** (id="features") — Section heading + 3-column grid
   of feature cards. Each card: icon/emoji, title, short description.
   Cards should have surface background, subtle border, rounded corners.

5. **HowItWorksSection** (id="how-it-works") — 3 numbered steps in a row.
   Step number (large, muted), title, description. Connected by a subtle line or arrow.

6. **TestimonialsSection** (id="testimonials") — 2–3 testimonial cards
   in a grid. Quote text, author name, role/company. Subtle quotation marks.

7. **PricingSection** (id="pricing") — 2–3 pricing tiers in a row.
   Tier name, price, feature list, CTA button. Highlight the middle/"popular" tier.

8. **CTASection** (id="cta") — Full-width, centered. Bold headline,
   short text, large CTA button. Accent background or gradient.

9. **FooterSection** (id="footer") — Logo, 3–4 link columns, copyright line.
   Dark surface background, muted text.`}

Each section MUST be its own named function (e.g. function HeroSection()).
The default export is a Page component that renders them all sequentially.
`;

  const archetypeGrammar = getArchetypeSectionGrammar(options?.tasteProfile?.archetypeMatch);

  return `You are an expert React developer and senior product designer.
Generate a ${isPartialRegen ? "replacement section" : "complete landing page"} based on the creative brief below.

## Creative Brief
The following is a direction and intent — not literal copy. Use it to inform the visual language, tone, audience, and narrative of the page. Write compelling, ORIGINAL marketing headlines and body copy that feel specific to the product described. Never echo the brief text verbatim. Never use placeholder copy like "Your product name here" or "What teams say after working with X". Write real, persuasive copy as if you are the brand's copywriter.

"${prompt}"

${archetypeGrammar}

${variantSection}

${tasteSection}

## Design System — CSS Variables
${cssVars}

**CRITICAL**: Reference ALL colors, fonts, spacing, and radii via var(--xxx).
Do NOT hardcode hex values, pixel sizes, or font names.
Example: style={{ color: "var(--color-text)", padding: "var(--space-lg) var(--space-md)" }}

${TASTE_RUBRIC}
${sectionInstructions}

## Code Rules
1. Export a single default function component (the Page)
2. Each section is a separate named function for readability
3. Every section gets id="nav", id="hero", etc. for scroll navigation
4. Use framer-motion: import { motion } from "framer-motion"
5. Use whileInView={{ opacity: 1, y: 0 }} with initial={{ opacity: 0, y: 20 }}
   and viewport={{ once: true }} for entrance animations
6. Use staggerChildren: 0.1 on parent containers for card grids
7. Self-contained — no imports except React and framer-motion
8. Inline styles only (var(--xxx) references). No Tailwind, no CSS modules, no className
9. Use standard HTML semantics: <nav>, <section>, <footer>, <div>
   (Framer-compatible — no custom elements)
10. Responsive: use CSS grid/flexbox, clamp() for font sizes, max-width containers
11. All interactive elements (buttons, links) should have cursor: "pointer"
    and a subtle hover state via whileHover={{ opacity: 0.85 }}
12. Resist boilerplate: do not add pricing tables, testimonial carousels, logo bars, or feature-card triptychs unless they are earned by the brief and the references
13. NO image files, NO <img> tags referencing local paths. Use CSS gradients, SVG inline, or colored placeholder divs for visual elements. NEVER reference /images/, /assets/, /marketing/, or .webp/.png/.jpg files
14. Only use motion.div, motion.span, motion.section, motion.p, motion.h1, motion.h2, motion.h3, motion.h4, motion.nav, motion.footer, motion.header, motion.button, motion.ul, motion.li. Do NOT use motion.a (use a regular <a> tag with inline styles instead)

## Container Pattern
Every section should use this inner container pattern:
\`\`\`
<section id="xxx" style={{ padding: "var(--space-2xl) var(--space-md)" }}>
  <div style={{ maxWidth: 1200, margin: "0 auto" }}>
    ...content...
  </div>
</section>
\`\`\`

## Output Format
Return ONLY the TSX code. No markdown fences, no explanations.
Start with import statements, end with \`export default function Page() { ... }\`.`;
}

function sectionFnName(id: SectionId): string {
  const map: Record<SectionId, string> = {
    nav: "NavSection",
    hero: "HeroSection",
    "social-proof": "SocialProofSection",
    features: "FeaturesSection",
    "how-it-works": "HowItWorksSection",
    testimonials: "TestimonialsSection",
    pricing: "PricingSection",
    cta: "CTASection",
    footer: "FooterSection",
  };
  return map[id];
}

// ─── PageNode Tree Generation Prompt ──────────────────────────────────────────
// This prompt asks the AI to output a PageNode JSON tree that the canvas editor
// renders directly — unlike the TSX prompt which only feeds a preview iframe.

export function buildPageTreePrompt(
  tokens: DesignSystemTokens,
  prompt: string,
  siteName: string,
  options?: {
    variantMode?: VariantMode;
    tasteProfile?: TasteProfile | null;
    fidelityMode?: FidelityMode;
  }
): string {
  const variantMode = options?.variantMode;
  const tasteProfile = options?.tasteProfile;
  const compiledDirectives = compileTasteToDirectives(
    tasteProfile,
    options?.fidelityMode ?? "balanced"
  );
  const tasteSection = directivesToPromptText(compiledDirectives);
  const variantSection = variantMode ? VARIANT_DIRECTIVES[variantMode] : "";

  const archetypeGrammar = getArchetypeSectionGrammar(options?.tasteProfile?.archetypeMatch);

  const bannedTypes = getArchetypeBannedNodeTypes(options?.tasteProfile?.archetypeMatch);
  const banSection = bannedTypes.length > 0
    ? `
## BANNED NODE TYPES FOR THIS ARCHETYPE
Do NOT use these node types anywhere in the output:
${bannedTypes.map(t => `- "${t}" — this is a product/SaaS pattern, not appropriate for this archetype`).join("\n")}

If you need to show multiple items, use individual heading+paragraph children inside a section instead of a grid node.
`
    : "";

  return `You are a senior product designer and copywriter generating a landing page as a structured PageNode JSON tree.

## Creative Brief
"${prompt}"

Site name: ${siteName}

${archetypeGrammar}
${banSection}

${variantSection}

${tasteSection}

## PageNode Schema

A PageNode is a JSON object:
\`\`\`
{
  "id": string,       // unique, e.g. "section-abc123"
  "type": PageNodeType,
  "name": string,     // human-readable label
  "content": {        // optional — text content + media
    "text": string,
    "subtext": string,
    "kicker": string,
    "label": string,
    "href": string,
    "price": string,
    "badge": string,
    "meta": string,
    "icon": string,
    "mediaUrl": "photo:description of desired image",   // use for ANY image — hero photos, editorial photography, product shots, portraits. Write a specific, descriptive prompt.
    "mediaAlt": string   // accessible alt text for the image
  },
  "style": {          // optional — visual properties
    "background": string,    // hex color
    "foreground": string,    // hex color
    "muted": string,         // hex color for muted text
    "accent": string,        // hex color
    "borderColor": string,
    "fontFamily": string,
    "fontSize": number,
    "fontWeight": number,
    "lineHeight": number,
    "letterSpacing": number,
    "borderRadius": number,
    "paddingX": number,
    "paddingY": number,
    "gap": number,
    "columns": number,
    "maxWidth": number,
    "minHeight": number,
    "align": "left" | "center" | "right",
    "direction": "row" | "column",
    "justify": "start" | "center" | "end" | "between",
    "opacity": number,
    "shadow": "none" | "soft" | "medium",
    "emphasized": boolean,
    "badgeTone": "surface" | "accent" | "outline"
  },
  "children": PageNode[]
}
\`\`\`

Valid PageNodeType values:
"page" | "section" | "heading" | "paragraph" | "button-row" | "button" | "metric-row" | "metric-item" | "logo-row" | "logo-item" | "feature-grid" | "feature-card" | "testimonial-grid" | "testimonial-card" | "pricing-grid" | "pricing-tier"

## Design Tokens (use these hex values in style properties)
- background: ${tokens.colors.background}
- surface: ${tokens.colors.surface}
- text: ${tokens.colors.text}
- textMuted: ${tokens.colors.textMuted}
- accent: ${tokens.colors.accent}
- primary: ${tokens.colors.primary}
- secondary: ${tokens.colors.secondary}
- border: ${tokens.colors.border}
- fontFamily: ${tokens.typography.fontFamily}

## Rules

1. The root node MUST be type "page" with children that are type "section"
2. Write COMPELLING, ORIGINAL marketing copy — not placeholder text like "Your Brand Here" or "Feature 1"
3. Write copy that sounds like a real brand's website, specific to the creative brief
4. Choose 4-7 sections based on the brief — do NOT always use the same template. Pricing is OPTIONAL. Logo bars are OPTIONAL.
5. Each section has a clear purpose and unique content
6. Use the design tokens for colors — put hex values in style.background, style.foreground, style.accent, etc.
7. Headings should be punchy and specific. Body text should be persuasive.
8. Feature cards need real icons (use single Unicode characters: ◈ → ◇ ⬡ ✦ ⊕ △ ○ □)
9. Testimonial quotes must feel authentic and specific to the product
10. Button text should be action-oriented and specific (not "Learn More" or "Get Started")
11. Every ID must be unique — use format "type-xxxx" where xxxx is 4+ random lowercase chars
12. Keep the JSON compact. Omit undefined/null fields.
13. style.paddingX and style.paddingY are in pixels (40-80 typical). style.gap is in pixels (12-30 typical).
14. For sections: borderRadius 14-30, minHeight 400-700 for hero, paddingX 40-64, paddingY 48-84
15. For feature-grid/testimonial-grid/pricing-grid: set columns (2 or 3) and gap (14-24)
16. IMAGES ARE CRITICAL: Use "mediaUrl": "photo:..." on section nodes and container nodes where images should appear. For editorial/portfolio archetypes, images should fill hero sections and alternate with text sections. Write specific photo descriptions like "photo:fashion model in dramatic side lighting, black and white, editorial portrait" not generic ones like "photo:image". Every section that should have a background image or featured image MUST use mediaUrl. Do NOT use paragraph nodes with gray backgrounds as image placeholders — use mediaUrl instead.

## Output
Return ONLY valid JSON. No markdown fences. No explanation. Just the root PageNode object starting with {.`;
}

// ─── Variant Transformation Prompts ──────────────────────────────────────────
// These transform an existing base PageNode tree instead of generating from
// scratch, cutting API calls from 3 independent generations to 1+2 derivations.

/**
 * Builds a prompt that transforms an existing PageNode tree
 * into a "pushed" variant — same taste DNA, bolder execution.
 */
export function buildPushedVariantPrompt(
  basePageTree: PageNode,
  tasteProfile: TasteProfile,
  _directives: CompiledDirectives
): string {
  const treeJson = JSON.stringify(basePageTree);
  const structuralGuard = getArchetypeStructuralGuard(tasteProfile?.archetypeMatch);
  const bannedTypes = getArchetypeBannedNodeTypes(tasteProfile?.archetypeMatch);
  const banGuard = bannedTypes.length > 0
    ? `\nBANNED NODE TYPES: Do NOT use ${bannedTypes.join(", ")} in the output.`
    : "";

  return `You are transforming an existing website design into a bolder interpretation of the same taste profile.

## Base Design (JSON PageNode tree)
${treeJson}

## Taste Profile Summary
Archetype: ${tasteProfile.archetypeMatch}
Mood: ${tasteProfile.adjectives?.join(", ")}
Palette: ${[tasteProfile.colorBehavior.suggestedColors.background, tasteProfile.colorBehavior.suggestedColors.accent, tasteProfile.colorBehavior.suggestedColors.text].filter(Boolean).join(", ")}
Fonts: ${tasteProfile.typographyTraits.recommendedPairings.join(", ")}
${structuralGuard}${banGuard}

## Transformation Instructions
Take this exact page structure and PUSH it:

1. **Palette temperature:** Shift warmer or cooler by one step. If light mode, try a dark hero section. If warm palette, push to richer earth tones.
2. **Spacing:** Tighten section padding by ~20%. Reduce gap by ~15%. Make it feel denser and more editorial.
3. **CTA prominence:** Make CTAs bolder — larger font, stronger contrast, more prominent placement.
4. **Typography:** If headings are medium weight, push to bold. If text is small, make it larger. Increase type scale drama.
5. **Section backgrounds:** Add contrast between alternating sections. Use the accent color as a section background somewhere.

## Rules
- Keep the SAME section order and types — do not add or remove sections
- Keep the SAME content/text — only change style properties
- Keep ALL colors within the taste palette (you can adjust opacity/temperature but not introduce new hues)
- Keep the same heading and body font families
- The root node MUST be type "page" with children that are type "section"
- Every ID must be unique — use format "type-xxxx" where xxxx is 4+ random lowercase chars
- Return a complete PageNode JSON tree with the same structure but modified style values

Return ONLY valid JSON. No markdown fences. No explanation. Just the root PageNode object starting with {.`;
}

/**
 * Builds a prompt that restructures an existing PageNode tree —
 * same palette and type, different layout and section arrangement.
 */
export function buildRestructuredVariantPrompt(
  basePageTree: PageNode,
  tasteProfile: TasteProfile,
  _directives: CompiledDirectives
): string {
  const treeJson = JSON.stringify(basePageTree);
  const structuralGuard = getArchetypeStructuralGuard(tasteProfile?.archetypeMatch);
  const bannedTypes = getArchetypeBannedNodeTypes(tasteProfile?.archetypeMatch);
  const banGuard = bannedTypes.length > 0
    ? `\nBANNED NODE TYPES: Do NOT use ${bannedTypes.join(", ")} in the output.`
    : "";

  return `You are restructuring an existing website design to explore a different layout while maintaining the same taste profile.

## Base Design (JSON PageNode tree)
${treeJson}

## Taste Profile Summary
Archetype: ${tasteProfile.archetypeMatch}
Mood: ${tasteProfile.adjectives?.join(", ")}
Palette: ${[tasteProfile.colorBehavior.suggestedColors.background, tasteProfile.colorBehavior.suggestedColors.accent, tasteProfile.colorBehavior.suggestedColors.text].filter(Boolean).join(", ")}
Fonts: ${tasteProfile.typographyTraits.recommendedPairings.join(", ")}
${structuralGuard}${banGuard}

## Restructuring Instructions
Keep the taste DNA (palette, fonts, mood) but REARRANGE the layout:

1. **Hero section:** If it's centered, make it split (text left, image/accent right). If it's split, make it full-bleed centered. Change the hero's structural approach.
2. **Features/cards:** If they're a 3-column grid, try a 2-column grid with larger cards. If they're cards, try a list layout. Change the grid structure.
3. **Section ordering:** Move testimonials or social proof earlier (right after hero) if they're currently later. Reorder for a different narrative flow.
4. **Content hierarchy:** If sections are evenly spaced, create more contrast — some sections compact, some generous.
5. **Asymmetry:** If the layout is centered/symmetric, push toward left-aligned and asymmetric. If already asymmetric, try centered elegance.

## Rules
- Keep the SAME palette colors — do not introduce new colors
- Keep the SAME font families
- Keep the SAME section types (don't add pricing if it wasn't there, don't remove sections)
- Rewrite section heading/body text ONLY if the structural change requires it
- You CAN change: section order, grid columns, alignment, padding, gap, hero style, card layout
- The root node MUST be type "page" with children that are type "section"
- Every ID must be unique — use format "type-xxxx" where xxxx is 4+ random lowercase chars
- Return a complete PageNode JSON tree

Return ONLY valid JSON. No markdown fences. No explanation. Just the root PageNode object starting with {.`;
}

// ─── PageNode validation + normalization ─────────────────────────────────────

const VALID_NODE_TYPES = new Set([
  "page", "section", "heading", "paragraph", "button-row", "button",
  "metric-row", "metric-item", "logo-row", "logo-item",
  "feature-grid", "feature-card", "testimonial-grid", "testimonial-card",
  "pricing-grid", "pricing-tier",
]);

function isValidPageNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const n = node as Record<string, unknown>;
  if (typeof n.type !== "string" || !VALID_NODE_TYPES.has(n.type)) return false;
  if (typeof n.id !== "string" || n.id.length === 0) return false;
  if (typeof n.name !== "string") return false;
  return true;
}

let pageTreeIdCounter = 0;
function ensureUniqueId(prefix: string): string {
  pageTreeIdCounter++;
  return `${prefix}-ai${pageTreeIdCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function validateAndNormalizePageTree(raw: unknown): { ok: true; tree: unknown } | { ok: false; reason: string } {
  pageTreeIdCounter = 0;

  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "root is not an object" };
  }

  const root = raw as Record<string, unknown>;
  if (root.type !== "page") {
    return { ok: false, reason: `root type is "${root.type}", expected "page"` };
  }

  if (!Array.isArray(root.children) || root.children.length === 0) {
    return { ok: false, reason: "root has no children sections" };
  }

  // Check that at least one child is a section
  const sections = root.children.filter(
    (c: unknown) => c && typeof c === "object" && (c as Record<string, unknown>).type === "section"
  );
  if (sections.length === 0) {
    return { ok: false, reason: "no section children found in root" };
  }

  // Deduplicate IDs and ensure all nodes are valid
  const seenIds = new Set<string>();

  function normalizeNode(node: unknown): unknown {
    if (!isValidPageNode(node)) return null;
    const n = { ...(node as Record<string, unknown>) };

    // Ensure unique ID
    let id = n.id as string;
    if (seenIds.has(id)) {
      id = ensureUniqueId(n.type as string);
    }
    seenIds.add(id);
    n.id = id;

    // Recursively normalize children
    if (Array.isArray(n.children)) {
      n.children = n.children
        .map((child: unknown) => normalizeNode(child))
        .filter(Boolean);
    }

    return n;
  }

  const normalized = normalizeNode(root);
  if (!normalized) {
    return { ok: false, reason: "root node failed validation" };
  }

  return { ok: true, tree: normalized };
}
