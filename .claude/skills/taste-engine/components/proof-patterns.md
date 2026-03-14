# Proof Patterns — Component Reference

Defines patterns for social proof sections in Studio OS site generation. Each maps to archetypes and ctaTone values.

---

## 1. Logo Bar

**Visual:** Row of company logos — customers, partners, or press mentions. Simple, horizontal, often with a "Trusted by" or "Used by teams at" label. Logos are desaturated or rendered in a single neutral tone.

**When to use:**
- Early in the page, before users need to think about features
- When the customer list itself is the proof (recognizable logos signal trust)
- As a section divider between hero and features

**Archetypes:** premium-saas, minimal-tech

**Layout specs:**
- Container: max-width 1100px, centered
- Logo row: `display: flex; gap: 48–64px; align-items: center; flex-wrap: wrap; justify-content: center`
- Logo height: 20–28px (consistent height, variable width)
- Logo treatment: `opacity: 0.5–0.65` or converted to `filter: brightness(0) saturate(0)` for monochrome

**Typography behavior:**
- Label: 12–14px, uppercase, tracked, muted opacity
- No other copy in this section

**TasteProfile mapping:**
- `ctaTone.hierarchy: "primary-dominant"`, `layoutBias.density: "balanced"`

---

## 2. Testimonial Cards

**Visual:** Grid of 2–3 testimonial cards with quote, name, title, and optionally a headshot. Cards have subtle borders, consistent padding, and no decorative elements.

**When to use:**
- When social proof from named individuals is more credible than logos
- After the features section, to validate claims
- Avoid decorative quotation marks — they read as low-effort

**Archetypes:** premium-saas, editorial-brand

**Layout specs:**
- Grid: 2 or 3 columns, `gap: 24px`
- Card: `padding: 28–36px; border: 1px solid [surface-border]; border-radius: 8–12px`
- Quote: appears first, no quotation mark decorations
- Attribution: below quote, `display: flex; align-items: center; gap: 12px`
- Headshot: 36–40px circle, optional (omit if imagery quality is inconsistent)

**Typography behavior:**
- Quote: 16–18px, regular weight, line-height 1.6
- Name: 14–15px, medium weight
- Title/Company: 13–14px, muted opacity

**TasteProfile mapping:**
- `ctaTone.style: "understated"`, `imageTreatment.cornerRadius: "pill"` (for headshots if used)

---

## 3. Case Study Previews

**Visual:** 2–3 case studies shown as large cards or editorial spans with: company name, result metric, and a visual. Links to a full case study.

**When to use:**
- Product is B2B with story-worthy customer results
- The results are specific and impressive enough to carry the section
- Editorial or premium-saas with a storytelling emphasis

**Archetypes:** editorial-brand, premium-saas

**Layout specs:**
- Option A (cards): 2-column grid, `gap: 24–32px`, cards are taller and visually heavier than testimonial cards
- Option B (editorial): stacked, alternating layout — left-aligned company context, right-aligned result
- Result metric: displayed prominently, 48–80px, bold or black weight
- Company logo: present, desaturated

**Typography behavior:**
- Metric: 48–80px, mono or geometric, strong contrast
- Supporting label: 14–16px below the metric
- Brief result narrative: 15–17px, 3–5 sentences maximum

**TasteProfile mapping:**
- `layoutBias.rhythm: "alternating"`, `typographyTraits.contrast: "high"`, `ctaTone.hierarchy: "primary-dominant"`

---

## 4. Metrics / Numbers

**Visual:** 3–4 large numbers with supporting labels. Simple, factual, high-contrast. No charts, no icons — just the numbers.

**When to use:**
- Product has impressive, specific, credible metrics
- Fast trust-building section; high information density in low space
- Numbers must be real and specific — "10K+ customers" is weak; "12,400 teams ship weekly" is strong

**Archetypes:** premium-saas, minimal-tech

**Layout specs:**
- 3–4 column layout, `gap: 48–80px`
- Each item: centered or left-aligned number + label stack
- Number: 56–80px, bold or black weight
- Label: 14–16px, muted opacity, below the number with 8px gap

**Typography behavior:**
- Numbers: geometric or monospaced, extreme weight contrast
- Labels: regular weight, neutral body tone
- Optional: thin vertical dividers between items (1px, low opacity)

**TasteProfile mapping:**
- `layoutBias.density: "balanced"`, `typographyTraits.contrast: "high"`, `layoutBias.rhythm: "uniform"`

---

## 5. Press Mentions

**Visual:** Quotes from publications — The Verge, TechCrunch, Forbes — with the publication's name (not just a logo). More editorial than logo bar; the quote provides specific context.

**When to use:**
- Press has said something specific and compelling about the product
- B2C or consumer-facing products where media validation matters
- Not suitable for early-stage products without substantive press coverage

**Archetypes:** editorial-brand, premium-saas (editorial variant)

**Layout specs:**
- Option A (horizontal scroll on mobile, row on desktop): `display: flex; gap: 32px`
- Option B (grid): 2–3 columns
- Each mention: publication name/logo + short pull quote
- No publication logo if the publication isn't recognizable — use name in text only

**Typography behavior:**
- Quote: 15–18px, italic serif or italic version of primary body font
- Publication name: 12–14px, bold, small caps or uppercase

**TasteProfile mapping:**
- `ctaTone.style: "editorial"`, `imageTreatment.style: "editorial"` (if publication logos used)
