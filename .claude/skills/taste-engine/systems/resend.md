# Resend — Design System Reference

**Canonical archetype:** `minimal-tech` with strong brand identity
**Primary influence:** Developer-first, dark mode, editorial black-and-white with rare accent moments

Resend is the canonical example of minimal-tech done with genuine brand personality. It is dark, spare, and typographically driven — but it doesn't feel anonymous. The site has a point of view. It is the reference for what minimal-tech looks like when executed with enough confidence to have a voice, not just a functional presence.

---

## Color System

**Mode:** Dark

**Background:** `#000000` — Resend uses true black, unlike Linear's near-black. This is a deliberate choice that makes the white text very high contrast.
**Surface 1:** `#0C0C0C` — very slight differentiation from background
**Surface 2:** `#1A1A1A` — card surface
**Border:** `#2A2A2A` — slightly more visible than Linear's borders
**Text primary:** `#EDEDED` — slightly warm off-white
**Text secondary:** `#8A8A8A`
**Text tertiary:** `#5C5C5C`

**Accent:** `#FFFFFF` — Resend's primary interactive color is white. CTAs, links, and highlights are pure white on a dark surface. No color accent.

**Brand accent (contextual):** `#FF4C30` — a warm red that appears rarely, for very specific brand moments (alerts, status indicators). Not a general accent.

**Key insight:** By using white as the "accent," Resend achieves maximum contrast without introducing color. This is extremely disciplined and works because the dark surface system is executed with precision.

---

## Typography

**Heading font:** `"Geist"` (Vercel's open-source typeface, adopted widely in developer tools)
**Body font:** `"Geist"` — same family
**Code font:** `"Geist Mono"` — integrated, first-class element

**Scale:**
- Hero: 60–80px, weight 600–700
- Heading 1: 40–52px, weight 600–700
- Heading 2: 28–36px, weight 600
- Body: 16px, weight 400, line-height 1.65
- Code / technical labels: `Geist Mono`, 14px
- Label / eyebrow: 12px, uppercase, tracked, `#5C5C5C`

**Type behavior:**
- Extremely minimal — no gradient text, no decorative type treatment
- Headlines are confident but not dramatized
- Code blocks are first-class content — not visually demoted
- Letter-spacing tight on headings: `-0.02em` to `-0.03em`

---

## Spacing System

- Section padding: 80–120px vertical
- Max content width: 1100px — narrower than Linear or Vercel, creates concentration
- Component gap: 16–24px
- Internal padding: 24–32px for cards
- The narrower content width creates a more editorial, concentrated reading experience

---

## Component Patterns

**Navigation:**
- Minimal: logo left, 3–4 links, "Get Started" CTA right
- Background: `rgba(0,0,0,0.85); backdrop-filter: blur(12px)` on scroll
- Height: 60px
- Link color: `#8A8A8A` (inactive), `#EDEDED` (hover)
- CTA: white filled button — `background: #EDEDED; color: #000; border-radius: 6px`

**Buttons:**
- Primary: `background: #EDEDED; color: #000; border-radius: 6px; padding: 10px 18px`
- Secondary: `border: 1px solid #2A2A2A; color: #EDEDED; border-radius: 6px`
- Ghost: `color: #8A8A8A` with underline on hover
- Shape: `border-radius: 6px` — consistent

**Code blocks:**
- Background: `#111111` — 1-step lighter than page
- Border: `1px solid #2A2A2A`
- Border-radius: `8px`
- Padding: `16–24px`
- Syntax highlighting: minimal — primarily white text with `#8A8A8A` comments
- Tab bar: file tabs with `#1A1A1A` active, `#0C0C0C` inactive
- Copy button: always present, `position: absolute; top: 12px; right: 12px`

**Feature cards:**
- Background: `#0C0C0C` or `#1A1A1A`
- Border: `1px solid #2A2A2A`
- Border-radius: `8px`
- Icon: monochrome, 24×24px
- No image content — icon + heading + description only
- Deliberately minimal: no screenshots, no illustrations

---

## Hero Approach

- Full-width, centered
- Heading: 60–80px — strong but not dramatic
- Subheading: developer-focused, technically specific (not generic)
- Code snippet below subheading: shows the actual API call needed to get started
- CTA: white primary + dark secondary
- Background: `#000000` with no decoration — total confidence in the typography

**Code snippet in hero:**
```
npm install resend
```
or
```typescript
await resend.emails.send({
  from: 'you@domain.com',
  to: 'user@email.com',
  subject: 'Hello world',
  html: '<p>Hello world</p>'
})
```

This code-as-hero is a defining feature of minimal-tech brands targeting developers.

---

## Section Rhythm

1. Hero with code snippet
2. Logo bar (subtle, minimal)
3. Feature cards (3-column)
4. Code-forward feature sections (API walkthrough)
5. Testimonials / developer quotes
6. Pricing (clean, table-based)
7. Bottom CTA

Rhythm: uniform with slight progression into denser technical content.

---

## What Makes Resend Distinctive

1. True black background — maximum contrast, maximum confidence
2. White as accent — the discipline of using only black, white, and gray is extreme
3. Developer copy that is specific, technical, and never marketing-inflated
4. Code blocks treated as visual design elements — sized, framed, and highlighted
5. Narrow content width creates concentration — the site doesn't sprawl
6. Hero that shows the actual 3-line integration — earns trust immediately
7. No illustration, no lifestyle imagery, no metaphor — only product and code
