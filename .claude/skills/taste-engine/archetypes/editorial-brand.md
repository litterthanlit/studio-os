# Archetype: Editorial Brand

**ID:** `editorial-brand`

## Description

Sites that function like a magazine translated to the web. The product or brand is communicated through narrative, not just features. Long-form rhythm, large expressive typography, and editorial image treatment create a reading experience as much as a browsing experience. Think: product launches that feel like cultural events, studios that treat their website as a publication.

The editorial approach is not about being verbose — it is about treating each page as a composed artifact. Section breaks feel considered. Image sizing decisions feel intentional. Typography sets the emotional register before you read a word.

The trap is losing product clarity in pursuit of editorial elegance. Beautiful sites that don't communicate what the product does are failures regardless of aesthetic quality.

## Canonical Examples

- **Are.na** — Radical editorial restraint. Typography as the primary design system.
- **Stripe Press** — Editorial hierarchy applied to a product context. Long-form reading experience.
- **Notion** (early 2023 redesign) — Editorial warmth + product clarity in balance.
- **Framer** — Editorial brand energy with product-led sections. Uses large type + ambient imagery.
- **New York Times Cooking** (web) — Editorial grid applied to utility product.
- **MSCHF** — Extreme editorial voice, anti-template, high creative risk.

## Typical TasteProfile Values

```json
{
  "layoutBias": {
    "density": "balanced",
    "rhythm": "alternating",
    "heroStyle": "text-dominant",
    "sectionFlow": "editorial-grid",
    "gridBehavior": "editorial",
    "whitespaceIntent": "dramatic"
  },
  "typographyTraits": {
    "scale": "dramatic",
    "headingTone": "editorial",
    "bodyTone": "literary",
    "contrast": "extreme",
    "casePreference": "mixed",
    "recommendedPairings": ["Newsreader + Inter", "Playfair Display + Source Sans", "Portrait + Suisse Intl", "Canela + Helvetica Now"]
  },
  "colorBehavior": {
    "mode": "light",
    "palette": "neutral-plus-accent",
    "accentStrategy": "single-pop",
    "saturation": "muted",
    "temperature": "warm"
  },
  "imageTreatment": {
    "style": "editorial",
    "sizing": "full-bleed",
    "treatment": "raw",
    "cornerRadius": "none",
    "borders": false,
    "shadow": "none",
    "aspectPreference": "mixed"
  },
  "ctaTone": {
    "style": "editorial",
    "shape": "sharp",
    "hierarchy": "text-link-preferred"
  }
}
```

## Detection Signals

Look for:
- Large serif or high-contrast display type as the primary visual element
- Images that read as photographs, not product shots — cropped, considered, breathing room
- Section padding that creates chapter-like breaks in the content
- Body text treated with care — size, leading, measure (line length) all deliberate
- CTAs embedded in prose rather than isolated button bars
- Navigation that's secondary to content — often minimal or hidden
- Grid: asymmetric column splits, text running alongside images
- Pull quotes, large standfirst text, caption-level type — editorial tools

## What Makes It Work

- The type system is the design system. Everything else serves it.
- Images are chosen for their compositional value, not just informational value.
- Pacing is intentional — the reader's eye is guided, not assaulted.
- Product information is present but framed within a larger story.
- Restraint in color makes the editorial voice louder.

## Failure Modes

- Forgetting to communicate the product — editorial tone without utility is a vanity site
- Choosing fonts by "feel" without establishing a clear hierarchy system
- Inconsistent image treatment — mixing editorial photography with generic illustrations
- Text-heavy without typographic contrast — editorial doesn't mean a wall of text
- Trying to be both editorial and feature-complete — pick a primary mode

## Archetype-Specific Avoids

- `"feature bullet lists with icons"` — destroys the editorial rhythm
- `"generic stock photography"` — antithetical to editorial voice
- `"card-grid feature sections"` — breaks the composed, flowing structure
- `"bright CTA buttons that interrupt reading"` — undermines editorial tone
- `"section dividers or heavy borders"` — editorial layout breathes, doesn't separate with lines
