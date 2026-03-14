# Archetype: Premium SaaS

**ID:** `premium-saas`

## Description

The flagship archetype of the modern web product era. Sites like Linear, Vercel, Raycast, and Resend have defined a visual language that communicates trust, precision, and technical authority without sacrificing warmth or aspiration. The aesthetic is characterized by generous whitespace, sharp typographic hierarchy, and a near-total rejection of decoration. Color is earned, not scattered.

The danger is generic execution. The archetype is so well-established that dozens of mediocre sites mimic its surface patterns — dark backgrounds, floating cards, purple gradients — without understanding what makes the originals work. The engine must find the specific personality within the restraint.

## Canonical Examples

- **Linear** — Dark mode, near-monochromatic, product screenshots as the primary visual content. Typography carries enormous authority through size contrast, not weight variation. Motion is purposeful and restrained.
- **Vercel** — Light mode default, intersects with minimal-tech. Strong hierarchy, minimal illustration, product-first. Code and UI screenshots treated as design objects.
- **Raycast** — Warmer personality than Linear. Product interface is front and center. Dark with richer surface contrast.
- **Resend** — Minimal-tech influence, developer-first, near-monochromatic with sharp brand moments.
- **Loom** — Product-led with warmer color approach. Social proof prominently integrated.

## Typical TasteProfile Values

```json
{
  "layoutBias": {
    "density": "spacious",
    "rhythm": "alternating",
    "heroStyle": "contained",
    "sectionFlow": "stacked",
    "gridBehavior": "strict",
    "whitespaceIntent": "structural"
  },
  "typographyTraits": {
    "scale": "expanded",
    "headingTone": "geometric",
    "bodyTone": "neutral",
    "contrast": "high",
    "casePreference": "mixed",
    "recommendedPairings": ["Inter + Inter", "Geist + Geist Mono", "Space Grotesk + DM Sans"]
  },
  "colorBehavior": {
    "mode": "dark",
    "palette": "monochromatic",
    "accentStrategy": "single-pop",
    "saturation": "muted",
    "temperature": "cool"
  },
  "imageTreatment": {
    "style": "product",
    "sizing": "contained",
    "treatment": "raw",
    "cornerRadius": "subtle",
    "borders": true,
    "shadow": "subtle",
    "aspectPreference": "landscape"
  },
  "ctaTone": {
    "style": "understated",
    "shape": "subtle-radius",
    "hierarchy": "primary-dominant"
  }
}
```

## Detection Signals

Look for:
- UI product screenshots used as design objects (not just illustrations)
- Near-zero decorative elements — every element is functional
- Section-level whitespace dominates the visual rhythm
- Typography does the heavy lifting for section separation
- One clearly dominant CTA, usually text-based or minimal button
- If dark: backgrounds #0A0A0A–#1A1A1A range, never blue-black
- If light: backgrounds #FAFAFA–#FFFFFF, surfaces very close in value
- Accent color used at maximum 5% surface coverage
- Navigation: minimal, sticky, often just logo + 2-3 links + CTA

## What Makes It Work

- Restraint is active, not lazy. Every absence of decoration is a choice.
- Typography scale creates hierarchy without needing color differentiation.
- Social proof is factual: metrics, logos, short quotes — never generic testimonials.
- The product interface IS the hero. No metaphors, no stock photography.
- Motion is additive, not decorative — it clarifies state and transitions.

## Failure Modes

- "Premium SaaS Starter Kit" look: dark + purple gradient + floating cards = dead on arrival
- Over-relying on glassmorphism — a surface texture that replaced thinking about layout
- Stock photos of "people collaborating" — immediately undermines the technical credibility
- Busy bento grids where every cell has equal visual weight — destroys hierarchy
- Testimonial carousels with headshots and star ratings — enterprise insurance, not design

## Archetype-Specific Avoids

- `"blue-purple gradient hero backgrounds"` — the cliché marker of low-effort SaaS design
- `"stock photography of people using laptops"` — destroys product credibility
- `"card-heavy bento layouts without visual hierarchy"` — entropy disguised as design
- `"glassmorphism surface treatment"` — overused, rarely executed well
- `"enterprise purple as primary brand color"` — means nothing, signals nothing
