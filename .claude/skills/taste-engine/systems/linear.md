# Linear — Design System Reference

**Canonical archetype:** `premium-saas`
**Primary influence:** Dark-mode precision, product-led design, motion culture

Linear is the canonical reference for what premium-saas design means at its most precise. It is an execution benchmark, not an inspiration board — the goal is never to copy Linear, but to understand what discipline at that level looks like so that lesser execution can be identified and corrected.

---

## Color System

**Mode:** Dark (primary), adaptive (system-aware light mode exists but dark is the primary experience)

**Background:** `#0B0B0F` — near-black with a very slight cool tone, not pure black
**Surface / card:** `#161618` — 1-step lighter, subtle differentiation
**Surface elevated:** `#1E1E21` — used for modals, popovers
**Border:** `rgba(255,255,255,0.06)` — near-invisible; present but not active
**Text primary:** `#E2E2E4` — slightly cool white, not pure `#FFFFFF`
**Text secondary:** `#7E7E8A` — muted purple-gray, not pure neutral

**Accent:** `#5E6AD2` — Linear's signature indigo-blue. Used sparingly:
- Active navigation items
- CTAs
- Progress indicators and highlights
- Never as a background fill on large surfaces

**Accent hover:** `#7179E0` — lighter on hover for interactive feedback

**Key insight:** Linear's background is not black — it's a very dark cool tone. The difference between `#000000` and `#0B0B0F` is immediately visible and contributes significantly to perceived quality.

---

## Typography

**Heading font:** `-apple-system, BlinkMacSystemFont, "Inter Variable", Inter, system-ui`
Linear uses system fonts first, then Inter. At large sizes, Inter Variable is preferred.

**Body font:** Same stack — unified, no serif or contrasting typeface

**Scale:**
- Display (hero): 56–72px, weight 600–700
- Heading 1: 40–48px, weight 600
- Heading 2: 28–32px, weight 600
- Heading 3: 20–22px, weight 500–600
- Body: 15–17px, weight 400–450, line-height 1.6–1.65
- Caption / label: 12–13px, weight 500, tracking 0.02em

**Type behavior:**
- Zero decorative type — no gradients on headings, no unusual treatments
- Hierarchy is achieved entirely through size and weight, not color
- Secondary text uses opacity rather than a different color (`opacity: 0.55–0.7`)
- All body text is left-aligned; no centered paragraph text

---

## Spacing System

Linear uses an 8px base grid with 4px increments for micro-spacing.

**Micro:** 4px (icon-to-label gaps, internal padding minimums)
**Small:** 8px, 12px, 16px
**Medium:** 24px, 32px, 40px
**Large:** 48px, 64px, 80px
**XL:** 120px, 160px (section padding)

**Section padding:** 120–160px vertical on marketing pages
**Content max-width:** 1080–1280px, centered with 24–48px horizontal padding

---

## Component Patterns

**Navigation:** Minimal sticky — logo left, 4 links center-right, "Get Linear" button far right.
- Background: transparent until scroll, then `rgba(11,11,15,0.85) blur(12px)`
- Link style: 14px, weight 450, `#7E7E8A` (inactive), `#E2E2E4` (hover/active)

**Buttons:**
- Primary: `background: #E2E2E4; color: #0B0B0F` (inverted on dark) — not the accent color
- Secondary: border only `rgba(255,255,255,0.12)`, text `#C4C4C8`
- Shape: `border-radius: 6px` — subtle, not sharp, not rounded
- Size: `padding: 10px 20px`, `font-size: 14px`, `font-weight: 500`

**Cards / feature surfaces:**
- Background: `#161618` or `#1E1E21`
- Border: `1px solid rgba(255,255,255,0.06)`
- Border-radius: `8–12px`
- Box-shadow: `0 1px 2px rgba(0,0,0,0.5)` — extremely subtle

**Product screenshot treatment:**
- Corner radius: `12px`
- Border: `1px solid rgba(255,255,255,0.1)`
- Background behind screenshot: `#0D0D10` surface — screenshot sits within a contained frame

---

## Hero Approach

- Heading: 56–72px, centered, weight 600
- Subheading: 18–20px, centered, `#7E7E8A`, 24px gap below heading
- CTA row: two buttons (primary + secondary), centered, 12px gap
- Background: default page background — no gradient, no decorative element
- Animation: subtle particle or gradient mesh in the background — never distracting

---

## Section Rhythm

1. Hero (full viewport)
2. Logo bar (customer logos, ~72px vertical)
3. Feature sections (alternating, 120px vertical padding each)
4. Product deep-dive section (full-width, dark surface)
5. Testimonial/proof section
6. Metrics section
7. Bottom CTA

Rhythm: uniform → alternating. No dramatic scale breaks. Coherence is the point.

---

## Animation Philosophy

Linear treats animation as a product differentiator:
- Entrance animations: `translate3d(0, 20px, 0)` → `translate3d(0,0,0)` + `opacity: 0→1`, 600ms ease-out, staggered
- Hover states on cards: `scale(1.01)` with `200ms ease`
- CTA hover: slight glow (`box-shadow: 0 0 0 2px rgba(94,106,210,0.3)`)
- Never: spinning, bouncing, or dramatic motion
- All transitions: `ease` or `cubic-bezier(0.16, 1, 0.3, 1)` — smooth deceleration

---

## What Makes Linear Distinctive

1. The cool near-black background that reads as dark without reading as harsh
2. No gradient treatments — dark mode without the clichés
3. The indigo accent used at surgical precision — 5% surface coverage maximum
4. Typography that earns authority through scale alone, no decorative effects
5. Motion that feels like a product engineer designed it, not a motion designer
6. Zero lifestyle photography — the product IS the content
