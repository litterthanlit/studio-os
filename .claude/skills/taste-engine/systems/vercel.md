# Vercel — Design System Reference

**Canonical archetype:** `premium-saas` + `minimal-tech`
**Primary influence:** Light-mode default, deployment/infrastructure brand, technical clarity with warmth

Vercel represents the intersection of premium-saas and minimal-tech. Unlike Linear, Vercel defaults to light mode and has evolved toward a warmer, more editorial feel while maintaining technical precision. It is the canonical reference for a product that serves both developers (minimal-tech expectations) and decision-makers (premium-saas expectations) simultaneously.

---

## Color System

**Mode:** Light default, dark mode available

**Light mode:**
- Background: `#FFFFFF`
- Background secondary: `#FAFAFA`
- Surface: `#F5F5F5`
- Border: `#EAEAEA`
- Text primary: `#000000` (true black in light mode — distinctive)
- Text secondary: `#666666`

**Dark mode:**
- Background: `#000000` — Vercel uses true black, unlike Linear's near-black
- Surface: `#111111`
- Border: `#333333`
- Text primary: `#FFFFFF`
- Text secondary: `#888888`

**Accent:** `#000000` / `#FFFFFF` (inverted) — Vercel's primary CTA is black-on-white in light mode. No color accent in the default system.

**Secondary accent:** In specific contexts, `#FF4F00` (Vercel orange) appears for hot paths / deploy status but is NOT part of the standard palette.

**Key insight:** Vercel is one of the few premium-saas sites with zero color accents in the default interaction system. Black is the action color. This is extremely bold and only works because of the strong typography system underneath.

---

## Typography

**Heading font:** `"Geist", -apple-system, BlinkMacSystemFont, system-ui` — Vercel's own typeface
**Body font:** Same Geist stack

**Geist characteristics:** Geometric sans, optimized for screen, designed by Vercel. Distinctive letterforms without being decorative. The closest Google Fonts equivalent is Space Grotesk or Inter but Geist has its own rhythm.

**Scale:**
- Hero: 64–80px, weight 700
- Heading 1: 48px, weight 700
- Heading 2: 32–40px, weight 600–700
- Body: 16px, weight 400, line-height 1.6
- Mono / code: `"Geist Mono"` — used within code blocks and technical labels

**Code as design:** Vercel uses `Geist Mono` for CLI snippets, file paths, and technical labels. The monospace type functions as both utility and branding.

---

## Spacing System

- Section padding: 80–120px vertical
- Max content width: 1200px with 24px gutters
- Feature section gap: 64–80px between text and media
- Component gap: 16–24px

---

## Component Patterns

**Navigation:**
- Transparent on hero, `rgba(0,0,0,0.8) blur(12px)` on scroll (dark mode)
- Light mode: white background sticky
- Link style: 13px, weight 450, subtle hover state
- CTA: black filled button (light mode) or white filled button (dark mode) — extremely high contrast

**Buttons:**
- Primary (light): `background: #000; color: #fff; border-radius: 6px; padding: 8px 16px`
- Primary (dark): `background: #fff; color: #000; border-radius: 6px; padding: 8px 16px`
- Secondary: ghost with border
- Shape: `border-radius: 6px` — consistent with the precision of the system

**Cards / feature surfaces:**
- Light mode: white card, `1px solid #EAEAEA`, `border-radius: 12px`
- Dark mode: `#111111` surface, `1px solid #333333`, `border-radius: 12px`
- Shadow: very subtle in light mode (`0 4px 16px rgba(0,0,0,0.04)`), none in dark

---

## Hero Approach

- Heading: 64–80px, centered, left-aligned on some pages
- Often uses a gradient mesh or subtle blur background element
- Product UI visible in the hero — a dashboard preview or deployment visualization
- CTA: black button (light) — extremely confident, zero ambiguity about the action

---

## Section Rhythm

1. Hero with product preview
2. Customer logos
3. Feature sections — developer tools focus
4. Enterprise / team sections
5. Platform comparison
6. Bottom CTA with "Deploy your first project" framing

Rhythm: alternating, with occasional full-width breaks for pricing/plan comparison.

---

## What Makes Vercel Distinctive

1. Black as the primary action color — no color needed when the system is this tight
2. Geist typeface gives it a completely owned typographic identity
3. Code snippets styled as first-class visual elements — not afterthoughts
4. The grid discipline is flawless — everything aligns, always
5. Both light and dark modes are fully designed — not one inverted from the other
6. Hero often shows actual deployment output — "ship" is the brand idea, not a metaphor
