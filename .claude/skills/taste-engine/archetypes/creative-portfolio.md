# Archetype: Creative Portfolio

**ID:** `creative-portfolio`

## Description

Personal sites, studio sites, and creative showcases. The site is the work as much as the work itself. Identity is expressed through composition, typographic choices, and movement — not through template selection. Great creative portfolios have a point of view about how information should be organized, navigated, and revealed.

These sites are authored, not assembled. The designer's voice is present throughout. Navigation itself can be a design statement. The grid might be broken deliberately. Typography might be the primary visual element.

The trap is overdesign: a site so focused on impressing designers that it becomes hard to use, or so template-adjacent that it looks like a Readymag starter. The other trap is looking derivative — borrowing from a trend (brutalism, neo-neo-grotesque) without having an actual point of view.

## Canonical Examples

- **Bruno Simon** — 3D interactive portfolio, extreme experiment, fully self-authored
- **Femke van Schoonhoven** — Editorial structure, clean, confident hierarchy
- **Maxime Bourgeois** — Typographic experimentation with structural discipline
- **Studio Fnt** — Korean design studio, asymmetric layouts, editorial image use
- **Active Theory** — Experimental + narrative, technology-led
- **Koto Studio** — Agency portfolio, case-study-first, confident typographic system

## Typical TasteProfile Values

```json
{
  "layoutBias": {
    "density": "spacious",
    "rhythm": "asymmetric",
    "heroStyle": "text-dominant",
    "sectionFlow": "editorial-grid",
    "gridBehavior": "broken",
    "whitespaceIntent": "dramatic"
  },
  "typographyTraits": {
    "scale": "dramatic",
    "headingTone": "display",
    "bodyTone": "neutral",
    "contrast": "extreme",
    "casePreference": "mixed",
    "recommendedPairings": ["Neue Haas Grotesk + Freight Display", "Favorit + Mercury", "Aktiv Grotesk + Canela", "PP Editorial New + Neue Montreal"]
  },
  "colorBehavior": {
    "mode": "light",
    "palette": "neutral-plus-accent",
    "accentStrategy": "single-pop",
    "saturation": "muted",
    "temperature": "neutral"
  },
  "imageTreatment": {
    "style": "editorial",
    "sizing": "mixed",
    "treatment": "raw",
    "cornerRadius": "none",
    "borders": false,
    "shadow": "none",
    "aspectPreference": "mixed"
  },
  "ctaTone": {
    "style": "understated",
    "shape": "sharp",
    "hierarchy": "text-link-preferred"
  }
}
```

## Detection Signals

Look for:
- Work presented at large scale, not thumbnailed
- Navigation that itself communicates the designer's sensibility
- Typographic scale jumps: enormous headlines alongside small labels
- Color used as a statement, not as decoration — often a single, deliberate accent
- White space used structurally — pages that feel "empty" until you understand the composition
- Case study pages that feel like publications, not feature lists
- First-person voice in copy — owned, direct, not passive agency-speak

## What Makes It Work

- The site makes you feel the designer's point of view before you see the work
- Work is presented at a quality that gives it justice — no tiny thumbnails
- Navigation is memorable in some way — hover states, structure, or voice
- Copy is specific and direct — not "I help brands tell their story"
- The design system is minimal but deliberate — two fonts maximum, one accent

## Failure Modes

- Portfolio-template look: Readymag / Cargo / Squarespace defaults with different content
- Overloading every page with micro-interactions — motion without purpose
- Generic project thumbnails that don't communicate the nature of the work
- Vague "I'm a designer who loves craft" copy — says nothing
- Trying to please everyone — the best portfolios have a specific target audience

## Archetype-Specific Avoids

- `"generic project card grids with hover-reveal titles"` — the template trap
- `"'I help brands tell their story' or similar vague positioning copy"` — authenticity destroyer
- `"excessive micro-interaction on scroll"` — replaces thought with technique
- `"thumbnail-grid case study layout"` — undersells the work
- `"contact form as the primary CTA"` — passive, low-intent
