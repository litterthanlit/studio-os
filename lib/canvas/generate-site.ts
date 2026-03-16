import type { DesignSystemTokens } from "./generate-system";
import type { TasteProfile } from "@/types/taste-profile";

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

// ─── Variant Layout Directives ──────────────────────────────────────────────

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

  // Structured taste directives
  const tasteSection = tasteToDesignDirectives(tasteProfile);
  const fidelitySection = referenceFidelityRules(tasteProfile);

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

  return `You are an expert React developer and senior product designer.
Generate a ${isPartialRegen ? "replacement section" : "complete landing page"} based on the creative brief below.

## Creative Brief
The following is a direction and intent — not literal copy. Use it to inform the visual language, tone, audience, and narrative of the page. Write compelling, ORIGINAL marketing headlines and body copy that feel specific to the product described. Never echo the brief text verbatim. Never use placeholder copy like "Your product name here" or "What teams say after working with X". Write real, persuasive copy as if you are the brand's copywriter.

"${prompt}"

${variantSection}

${tasteSection}

${fidelitySection}

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
