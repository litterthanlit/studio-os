# Archetype: Minimal Tech

**ID:** `minimal-tech`

## Description

The design language of infrastructure, developer tooling, and data-layer companies. Extreme economy. Every element earns its place through function. Technical credibility is communicated through precision and discipline, not through illustration or decoration. Sites in this archetype often look deceptively simple — the craft is in the spacing, the type hierarchy, and the surgical use of color.

The minimal-tech aesthetic is distinct from premium-saas in that personality is often secondary to precision. These sites trust their audience to be sophisticated. They don't need to sell — they need to establish credibility fast and get out of the way.

The trap is lifeless enterprise: technically correct but emotionally inert. Empty minimalism that signals nothing.

## Canonical Examples

- **Stripe** (developer docs, API reference) — Grid discipline, monospaced type as a design element, zero decoration
- **Planetscale** — Dark, infrastructure-first, typography hierarchy communicates depth
- **Railway** — Minimal dark, code-first narrative, small type that rewards attention
- **Tailscale** — Light mode, grid-strict, every element has obvious purpose
- **Fly.io** — Developer voice with personality, minimal color use

## Typical TasteProfile Values

```json
{
  "layoutBias": {
    "density": "balanced",
    "rhythm": "uniform",
    "heroStyle": "text-dominant",
    "sectionFlow": "stacked",
    "gridBehavior": "strict",
    "whitespaceIntent": "structural"
  },
  "typographyTraits": {
    "scale": "moderate",
    "headingTone": "technical",
    "bodyTone": "technical",
    "contrast": "medium",
    "casePreference": "mixed",
    "recommendedPairings": ["Inter + JetBrains Mono", "IBM Plex Sans + IBM Plex Mono", "Geist + Geist Mono", "Suisse Intl + iA Writer Mono"]
  },
  "colorBehavior": {
    "mode": "light",
    "palette": "monochromatic",
    "accentStrategy": "single-pop",
    "saturation": "desaturated",
    "temperature": "neutral"
  },
  "imageTreatment": {
    "style": "product",
    "sizing": "contained",
    "treatment": "raw",
    "cornerRadius": "none",
    "borders": true,
    "shadow": "none",
    "aspectPreference": "landscape"
  },
  "ctaTone": {
    "style": "technical",
    "shape": "sharp",
    "hierarchy": "primary-dominant"
  }
}
```

## Detection Signals

Look for:
- Code blocks, terminal output, or API responses used as visual content
- Monospace typeface present in the design system (not just code examples)
- Near-zero illustration — diagrams if anything, and they look functional not decorative
- Color palette often: off-white or near-black background, minimal mid-tones, one accent
- Navigation: extremely minimal, often just docs / pricing / login
- No lifestyle photography — zero people, zero "vibes"
- Tight, uniform section rhythm — not many dramatic scale changes
- Numbers and metrics presented as data, not marketing

## What Makes It Work

- Precision communicates credibility to a technical audience
- Monospaced type creates visual texture without adding weight
- The grid is invisible but omnipresent — elements align to an implicit system
- Code as design: terminal windows, API responses, and CLI output styled with care
- Copy is technical and specific — avoids marketing language

## Failure Modes

- Corporate minimalism: no personality, no point of view — looks like enterprise SaaS from 2015
- Under-investing in typography: a plain font stack is not the same as considered minimalism
- Using "clean design" as an excuse to not make decisions
- Omitting all warmth and becoming cold and alienating
- Zero visual hierarchy — minimal doesn't mean flat, it means essential

## Archetype-Specific Avoids

- `"illustration or icon sets"` — breaks the technical credibility signal
- `"lifestyle or people photography"` — wrong audience, wrong tone
- `"gradient accents or colored backgrounds"` — undermines the precise, technical feel
- `"rounded-corner cards with drop shadows"` — too consumer SaaS, not infrastructure
- `"marketing-speak hero headlines"` — destroys developer trust
