import type { DesignSystemTokens } from "./generate-system";

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

// ─── Full Site Prompt ────────────────────────────────────────────────────────

export function buildSitePrompt(
  tokens: DesignSystemTokens,
  prompt: string,
  sectionId?: SectionId,
  existingSections?: string
): string {
  const cssVars = tokensToCSSVarBlock(tokens);
  const isPartialRegen = sectionId && existingSections;

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
Generate a full landing page with these sections in order:

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
   Dark surface background, muted text.

Each section MUST be its own named function (e.g. function HeroSection()).
The default export is a Page component that renders them all sequentially.
`;

  return `You are an expert React developer and senior product designer.
Generate a ${isPartialRegen ? "replacement section" : "complete landing page"} based on the user's request.

## User Request
"${prompt}"

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
8. Inline styles only (var(--xxx) references). No Tailwind, no CSS modules
9. Use standard HTML semantics: <nav>, <section>, <footer>, <div>
   (Framer-compatible — no custom elements)
10. Responsive: use CSS grid/flexbox, clamp() for font sizes, max-width containers
11. All interactive elements (buttons, links) should have cursor: "pointer"
    and a subtle hover state via whileHover={{ opacity: 0.85 }}

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
