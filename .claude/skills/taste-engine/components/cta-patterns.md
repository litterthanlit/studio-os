# CTA Patterns — Component Reference

Defines patterns for conversion moments in Studio OS site generation. Maps directly to `ctaTone` values in TasteProfile.

---

## 1. Hero CTA

**Visual:** Primary conversion action immediately below the hero headline + subheading. The most important CTA on the page. Typically a primary button + optional ghost/secondary button.

**Placement:** Below hero headline + subhead, 32–48px gap from subhead

**Archetypes:** All archetypes, with treatment variation

**Layout specs:**
- Button row: `display: flex; gap: 12–16px; flex-wrap: wrap`
- Primary button: `padding: 12–16px 24–32px`
- Secondary button: ghost style (border only) with same dimensions
- Alignment: left-aligned (most archetypes), centered (culture-brand, experimental)

**By ctaTone.style:**

- `"bold"`: Primary button has strong background fill, high contrast text, possibly slight shadow
  - Example: `background: #EDEDED; color: #0A0A0A; border-radius: 6px` (dark mode)
- `"understated"`: Primary button feels more like a badge than a call to action
  - Example: `background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12)`
- `"editorial"`: Text link with underline or arrow, no button shape
  - Example: `text-decoration: underline; font-weight: 500` + `→` arrow
- `"technical"`: Monospaced text or code-style shape
  - Example: button with monospaced label: `$ get started` or similar
- `"playful"`: Rounded shape (pill), bright fill

**By ctaTone.shape:**
- `"sharp"`: `border-radius: 0–2px`
- `"subtle-radius"`: `border-radius: 6–8px`
- `"rounded"`: `border-radius: 12–16px`
- `"pill"`: `border-radius: 999px`

---

## 2. Mid-Page CTA

**Visual:** Interstitial conversion moment between major sections. Less prominent than hero CTA — more of a reminder than a demand. Often a single button or text link.

**Placement:** After 2–3 content sections; before proof/testimonial sections

**Archetypes:** premium-saas, minimal-tech

**Layout specs:**
- Centered, isolated section with 80–100px vertical padding
- Single-line: label + button, horizontally arranged
- OR: two lines — statement above, button below
- No hero-scale typography — this is a quiet moment

**Typography behavior:**
- Statement: 20–28px, medium weight — a reassurance, not a demand
- Supporting text: 14–16px, optional
- Button: same style as hero CTA primary but can be slightly smaller

**TasteProfile mapping:**
- `ctaTone.hierarchy: "primary-dominant"`, `layoutBias.whitespaceIntent: "structural"`

---

## 3. Bottom CTA Section

**Visual:** Final conversion section at the bottom of the page. This is where users land if they've read everything and are now ready to act. It should be the highest-confidence moment on the page.

**Placement:** Last section before footer

**Archetypes:** All archetypes

**Layout specs:**
- Full-width or contained, with distinct background treatment
- Background options: accent fill, dark/light inversion from page default, subtle texture
- Centered layout with: headline + subhead + button(s)
- Vertical padding: 120–180px

**Typography behavior:**
- Headline: 40–64px — restates the product's promise, not just "Get started"
- Subhead: 18–22px, single line
- Buttons: same treatment as hero CTA

**By archetype:**
- `premium-saas`: Slightly darker surface, near-white text, one bold CTA
- `editorial-brand`: Large serif statement, editorial tone, text-link CTA
- `culture-brand`: High-contrast, possibly full-bleed image behind the CTA
- `minimal-tech`: Extremely minimal — just headline + text CTA, no decoration

**TasteProfile mapping:**
- `ctaTone.style`, `ctaTone.shape`, `ctaTone.hierarchy` all applied here at full strength

---

## 4. Inline Text CTAs

**Visual:** CTAs embedded within body copy or feature descriptions — not isolated buttons. Often underlined links or subtle inline arrows. Common in editorial and minimal-tech contexts.

**Placement:** Within feature sections, after testimonials, in narrative paragraphs

**Archetypes:** editorial-brand, minimal-tech, creative-portfolio

**Layout specs:**
- No separate container — part of the text flow
- Style: underline with accent color, or arrow icon inline (`→`)
- May be: "Learn more →" or "Read the case study →" or "See pricing"

**Typography behavior:**
- Same size as body text (15–18px)
- Accent color underline or text
- Not bold — belongs in the flow, not above it

**TasteProfile mapping:**
- `ctaTone.hierarchy: "text-link-preferred"`, `ctaTone.style: "editorial"` or `"understated"`

---

## 5. Sticky CTA Bar

**Visual:** A thin bar that appears at the top or bottom of the viewport after the user scrolls past the hero. Contains a minimal reminder CTA — logo or product name + single button.

**Placement:** Appears after hero is scrolled past; disappears if user scrolls back up

**Archetypes:** premium-saas, minimal-tech (use sparingly; can feel intrusive)

**Layout specs:**
- `position: fixed; bottom: 0; width: 100%; z-index: 50`
- Height: 56–64px
- Background: blur + `rgba(10,10,10,0.9)` (dark) or `rgba(250,250,250,0.9)` (light)
- Content: left — product name or tagline; right — single CTA button
- Appears on scroll trigger: `window.scrollY > heroHeight`
- `transition: transform 400ms ease` for appear/disappear animation

**Do not use when:**
- Site already has a sticky navigation — double sticky = friction
- The site is editorial or cultural — ruins the reading experience
- ctaTone.style is "editorial" or "text-link-preferred"

**TasteProfile mapping:**
- `ctaTone.style: "bold"` or `"technical"`, `ctaTone.hierarchy: "primary-dominant"`
