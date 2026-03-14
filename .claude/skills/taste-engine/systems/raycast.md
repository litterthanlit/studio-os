# Raycast — Design System Reference

**Canonical archetype:** `premium-saas` with strong product-led personality
**Primary influence:** Dark mode, product interface as hero, warmer personality than Linear

Raycast represents premium-saas with the most personality of any reference in this set. Where Linear is cold and precise, Raycast is warm and expressive — while still maintaining the discipline that separates premium-saas from generic SaaS. The product UI is everywhere on the site, and the brand voice is present in micro-copy and motion.

---

## Color System

**Mode:** Dark primary

**Background:** `#0C0C0E` — very dark, with a slight warm undertone (note: not cool like Linear)
**Surface 1:** `#1B1B1D` — primary card surface
**Surface 2:** `#222224` — elevated surfaces
**Surface 3:** `#2A2A2C` — modal level
**Border:** `rgba(255,255,255,0.06)` — barely visible
**Text primary:** `#EEEEEF` — slightly warm white
**Text secondary:** `#8E8E93` — medium gray, same tone as Apple system

**Gradient / personality accent:** Raycast uses a distinctive multicolor gradient on specific brand moments — pinks, oranges, purples, yellows in a soft bokeh/bloom effect. This is NOT applied broadly — it appears as a background bloom behind the hero or as a light halo on product UI.

**Specific gradient:** Soft bokeh circles: `rgba(255,105,180,0.2)` / `rgba(255,165,0,0.15)` / `rgba(147,51,234,0.2)` — blended at low opacity

**Key insight:** Raycast's warmth comes from the slight warm tone of its background, the warm white of the text, and the colorful bloom effect used sparingly. It is still dark and disciplined — the warmth is a spice, not the whole dish.

---

## Typography

**Heading font:** `-apple-system, "SF Pro Display"` (Apple system) + fallback to `"Inter Variable"`
**Body font:** `-apple-system, "SF Pro Text"` + fallback to `"Inter"`

Raycast leans on Apple's own typefaces, which gives it a native macOS feeling — appropriate for a macOS productivity application.

**Scale:**
- Hero: 72–96px, weight 700–800
- Heading 1: 48–64px, weight 700
- Heading 2: 32–40px, weight 600–700
- Body: 16–17px, weight 400, line-height 1.65
- Feature card heading: 20–22px, weight 600
- Label / eyebrow: 12px, uppercase, tracked, `rgba(255,255,255,0.4)`

**Type behavior:**
- Headlines are often dramatically large — Raycast uses 96px+ hero headings regularly
- Body text is relatively restrained — the type scale is bimodal: very large or normal
- Gradient text appears on specific hero headings — a rainbow gradient applied to the headline text itself
- This gradient text treatment is Raycast-specific and should not be recommended as a general pattern

---

## Spacing System

- Section padding: 120–160px vertical
- Max content width: 1200px
- Feature section columns: 3-column grid common for feature highlights
- Internal card padding: 28–40px
- Gap between feature cards: 16–24px

---

## Component Patterns

**Navigation:**
- Minimal sticky — logo left, navigation links center, CTA right
- Height: 64px
- Dark: `background: rgba(12,12,14,0.8); backdrop-filter: blur(20px)`
- Scrolled border: `border-bottom: 1px solid rgba(255,255,255,0.06)`

**Buttons:**
- Primary: `background: #FF6363; color: #fff; border-radius: 8px` — Raycast uses a reddish-orange CTA. This is brand-specific, not generic accent.
- Secondary: ghost with light border
- Hover: subtle scale + brightness change

**Feature cards:**
- Background: `#1B1B1D`
- Border: `1px solid rgba(255,255,255,0.06)`
- Corner: `12px`
- Inside: Raycast often shows actual product UI within the card — screenshots, command palettes, extension previews
- The card functions as a mini product demo environment

**Product screenshot framing:**
- Screenshot at desktop/window frame — shows the product in its actual context
- Frame: dark window chrome, subtle shadow
- Often shown at a slight angle or with subtle perspective — adds depth

---

## Hero Approach

- Background: `#0C0C0E` with colorful bokeh bloom behind the content
- Heading: 72–96px, centered, often gradient-text treatment on key words
- Product UI: centered product screenshot below the heading, large scale
- CTA: centered, primary (orange/red) + "Extensions" secondary link
- The hero communicates what Raycast is by showing it at 100% immediately

---

## Section Rhythm

1. Hero with product screenshot + bokeh background
2. Social proof metrics
3. Feature grid (3-column)
4. Individual feature deep-dives (alternating)
5. Community / extensions section
6. Platform section (macOS, iOS)
7. Bottom CTA

Rhythm: alternating, with a dense feature grid early that gives way to more spacious individual feature moments.

---

## What Makes Raycast Distinctive

1. Warmth in a dark-mode product — the subtle warm undertone prevents coldness
2. The colorful bloom effect — distinctive, never overdone, immediately recognizable
3. Product screenshots show actual Raycast UI — the product is so good-looking it IS the marketing
4. Brand voice: Raycast's copy has personality and humor, unlike Linear's cold precision
5. Feature cards that contain actual product demos — not just icons and copy
6. The bimodal type scale: very large or normal, nothing in between
7. macOS-native feeling — no attempt to be platform-agnostic
