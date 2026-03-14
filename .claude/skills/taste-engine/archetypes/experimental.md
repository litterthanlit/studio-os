# Archetype: Experimental

**ID:** `experimental`

## Description

Poster-informed, art-directed, boundary-pushing sites that borrow from graphic design history, poster logic, and abstract visual composition. These are not websites that follow web conventions — they challenge them. The visual language comes from print design, generative art, brutalism, Swiss graphic design, or entirely invented systems.

This archetype requires the strongest design vision and the greatest execution risk. It is the only archetype where the design interest can actively compete with usability if not carefully controlled. The difference between a great experimental site and a failed one is whether there is a structural intelligence underneath the formal experimentation.

The trap is looking like a student project: experimental for its own sake, formally interesting but intellectually empty. The other trap is unusability — a site where the user cannot find what they need.

## Canonical Examples

- **Refik Anadol** — Data sculpture as visual system
- **Moniker** — Conceptual games and systems applied to web
- **Field.io** — Generative systems, motion-led design
- **Heco** — Graphic design studio, poster logic applied to web
- **Pentagram** (individual partner microsites) — Art-directed, deliberately unconventional
- **Manuel Vella** — Type-heavy poster aesthetics, experimental navigation

## Typical TasteProfile Values

```json
{
  "layoutBias": {
    "density": "balanced",
    "rhythm": "asymmetric",
    "heroStyle": "full-bleed",
    "sectionFlow": "overlapping",
    "gridBehavior": "broken",
    "whitespaceIntent": "dramatic"
  },
  "typographyTraits": {
    "scale": "dramatic",
    "headingTone": "display",
    "bodyTone": "neutral",
    "contrast": "extreme",
    "casePreference": "mixed",
    "recommendedPairings": ["Grilli Type GT Sectra + GT America", "PP Editorial New + PP Neue Machina", "Styrene + Untitled Sans", "Founders Grotesk + Mercury"]
  },
  "colorBehavior": {
    "mode": "mixed",
    "palette": "complementary",
    "accentStrategy": "multi-accent",
    "saturation": "vivid",
    "temperature": "neutral"
  },
  "imageTreatment": {
    "style": "abstract",
    "sizing": "full-bleed",
    "treatment": "filtered",
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
- Poster compositions: type and image treated as a unified surface, not separate layers
- Navigation that is itself a design object — not a utility bar
- Layouts that break the expected scroll path
- Type used as texture, architecture, or image content (not just communication)
- Generative or procedural visual elements
- Color used as composition tool, not branding signal
- Absence of familiar web conventions: no hero/features/testimonials structure
- Visual references from print, art, or poster design traditions (not web history)

## What Makes It Work

- There is a coherent conceptual framework underneath the formal choices
- The experimental form serves the content — it's not decoration
- Usability is protected within the experimental frame — users can navigate even if navigation is unconventional
- The system is consistent: the experiments follow internal rules
- The site earns the right to be experimental through craft execution

## Failure Modes

- Experimental as cover for not having a point of view
- Formal complexity that actively obscures content or navigation
- Borrowing an experimental gesture (e.g., cursor interactions, text scramble) without the full system
- Looking like it was made to impress other designers, not to communicate anything
- Student-project energy: cool references assembled without original thinking

## Guardrails (Apply These Strictly)

This archetype requires explicit guardrails during generation:
1. Core navigation must remain findable regardless of how it is designed
2. The main value proposition must be communicable within 10 seconds
3. At least one section must follow a conventional reading pattern
4. Mobile usability cannot be sacrificed for desktop experimental effects

## Archetype-Specific Avoids

- `"conventional hero / features / testimonials / CTA page structure"` — the wrong scaffold for this direction
- `"sans-serif type set at standard web sizes"` — too neutral, doesn't earn the experimental designation
- `"standard web component patterns (cards, tabs, accordions)"` — breaks the invented system
- `"random or arbitrary composition"` — experimental must follow internal logic, not randomness
- `"obscure navigation for its own sake"` — usability is never optional
