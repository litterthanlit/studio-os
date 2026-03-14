# Archetype: Culture Brand

**ID:** `culture-brand`

## Description

Fashion, streetwear, lifestyle, music, and culture-driven brands. The site is a cultural artifact as much as a commercial tool. Strong graphic tension, confident and often aggressive typography, visual authorship that goes beyond UI design into brand identity territory. These sites understand that the site is the brand, not just the brand's website.

Color decisions are bold and not apologetic. Typography is used graphically — scale, weight, and placement are compositional tools. Photography is chosen for cultural resonance, not product clarity.

The trap is moodboard soup: a site that assembles reference imagery and aesthetic gestures without a coherent structure underneath. All vibe, no spine. The site should feel authored, not curated.

## Canonical Examples

- **Palace Skateboards** — Aggressive type, irreverent voice, graphic sensibility
- **Jacquemus** — Fashion editorial energy, large imagery, minimal navigation
- **Supreme** — Iconic simplicity. The box logo teaches restraint.
- **Aries** — Graphic, irreverent, culture-fluent
- **Madhappy** — Warm, optimistic, lifestyle photography with brand voice
- **Carhartt WIP** — Utilitarian heritage with editorial photography treatment

## Typical TasteProfile Values

```json
{
  "layoutBias": {
    "density": "balanced",
    "rhythm": "alternating",
    "heroStyle": "full-bleed",
    "sectionFlow": "stacked",
    "gridBehavior": "editorial",
    "whitespaceIntent": "dramatic"
  },
  "typographyTraits": {
    "scale": "dramatic",
    "headingTone": "display",
    "bodyTone": "neutral",
    "contrast": "extreme",
    "casePreference": "uppercase-headings",
    "recommendedPairings": ["Druk + Grotesk MT", "Compakt + Helvetica Neue", "F Grotesk + F Grotesk", "Aktiv Grotesk Ex + Aktiv Grotesk"]
  },
  "colorBehavior": {
    "mode": "dark",
    "palette": "monochromatic",
    "accentStrategy": "single-pop",
    "saturation": "muted",
    "temperature": "neutral"
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
    "style": "bold",
    "shape": "sharp",
    "hierarchy": "primary-dominant"
  }
}
```

## Detection Signals

Look for:
- Large-format photography used at full bleed — cropped aggressively, not centered politely
- Typography used graphically: oversized letterforms, text as image element
- Uppercase or all-caps as a default type treatment
- Dark modes with near-black backgrounds, or stark white with black ink
- Brand voice present in micro-copy — not just "Add to cart" but something more authored
- Product presented as lifestyle object, not feature list
- Minimal navigation — the brand doesn't need to explain itself
- Grid might be intentionally broken or asymmetric as a graphic statement

## What Makes It Work

- The brand voice is present in every element, down to the hover state copy
- Photography is chosen for cultural signal, not product clarity
- Typography makes a compositional statement before you read a word
- The site rewards close attention — details are considered
- Restraint in color amplifies the graphic tension

## Failure Modes

- Moodboard soup: collected references that look cool together but have no system
- Typography chosen for "cool factor" without establishing a clear hierarchy
- Photography mixed carelessly — editorial shots next to e-commerce product photos
- Navigation that tries to be clever but becomes unusable
- Trying to serve too many audiences — culture brands have a specific tribe

## Archetype-Specific Avoids

- `"product photography on white backgrounds"` — wrong register entirely
- `"sans-serif body text in mainstream weights"` — too neutral for the brand voice
- `"feature sections with benefit bullet points"` — corporate structure, cultural death
- `"hero section with subheadline starting with 'We are'"` — passive, anonymous
- `"stock lifestyle photography"` — immediately breaks cultural authenticity
