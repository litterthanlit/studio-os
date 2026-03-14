# Hero Patterns — Component Reference

Defines 8 hero patterns used across Studio OS site generation. Each pattern includes: visual description, when to use, archetype mapping, layout specs, typography behavior, and TasteProfile mapping.

---

## 1. Full-Bleed Media Hero

**Visual:** Image or video fills the entire viewport (100vw × 100vh). Text overlaid on or immediately below the media. The media is the first thing seen — typography is secondary.

**When to use:**
- The brand has strong, art-directed photography or video
- The medium IS the message — the site is about a visual product or experience
- Cultural or fashion brands where first impression = brand feeling

**Archetypes:** culture-brand, editorial-brand, experimental

**Layout specs:**
- Container: `width: 100vw; height: 100vh; overflow: hidden`
- Media: `object-fit: cover; width: 100%; height: 100%`
- Text: `position: absolute; bottom: 48px; left: 48px` or overlaid center
- Never center the text if the hero image is compositionally active

**Typography behavior:**
- Heading: ≥ 80px, typically white or light against dark media
- If media is light, text may be dark with a subtle scrim
- Subheading may be suppressed — let the media speak first

**TasteProfile mapping:**
- `heroStyle: "full-bleed"`, `imageTreatment.sizing: "full-bleed"`, `layoutBias.whitespaceIntent: "dramatic"`

---

## 2. Contained Product Hero

**Visual:** Max-width container; headline on left, product screenshot or UI on right (or below on a single column). The product interface is the hero image.

**When to use:**
- Product is the proof — showing the interface is more persuasive than describing it
- Technical or SaaS products where users want to see before they read

**Archetypes:** premium-saas, minimal-tech

**Layout specs:**
- Container max-width: 1100–1280px, centered
- Two-column split (50/50 or 55/45): `grid-template-columns: 1fr 1fr`
- Vertical padding: 120–160px top and bottom
- Product screenshot: subtle border + corner radius (4–8px) + box-shadow (subtle)

**Typography behavior:**
- Heading: 64–96px, geometric sans, high weight contrast
- Subheading: 18–22px, neutral body font, 60–65% text-primary opacity
- CTA: 16px, primary button + ghost secondary, spaced 12px apart

**TasteProfile mapping:**
- `heroStyle: "contained"`, `layoutBias.density: "spacious"`, `imageTreatment.style: "product"`

---

## 3. Split Layout Hero

**Visual:** Left column is text; right column is media (or vice versa). Equal visual weight between the two halves. The split is the structure.

**When to use:**
- The product has a strong visual and strong copy simultaneously
- You want to balance narrative (left) with evidence (right)
- Premium-saas with an editorial influence

**Archetypes:** premium-saas, editorial-brand

**Layout specs:**
- `display: grid; grid-template-columns: 1fr 1fr` (desktop)
- Text column: `padding: 120px 80px 120px 0` (left column with max-width container)
- Media column: image/video, may extend to viewport edge on right
- Breakpoint: single column on mobile, media stacks below text

**Typography behavior:**
- Heading: 56–80px, left-aligned
- Subhead: 18–20px
- CTA: positioned after subhead with 32px gap

**TasteProfile mapping:**
- `heroStyle: "split"`, `layoutBias.rhythm: "alternating"`, `gridBehavior: "strict"`

---

## 4. Text-Dominant Hero

**Visual:** Typography is the hero. No images or only a subtle background element. The headline is large enough to be the primary visual element. Everything is built around the type.

**When to use:**
- The product's value proposition is best stated, not shown
- Editorial or minimal-tech contexts where imagery feels commercial
- When the typography system is strong enough to carry the page alone

**Archetypes:** editorial-brand, minimal-tech, creative-portfolio

**Layout specs:**
- Single column, centered or left-aligned
- Heading: clamp(64px, 10vw, 140px) — fills visual space
- Max-width: 900–1100px (long headline may extend wider)
- Vertical padding: 140–200px

**Typography behavior:**
- Heading: dramatic scale, single line or two lines maximum
- Subhead: 20–24px, placed 40px below heading
- CTA: text link or minimal ghost button — don't interrupt the typographic moment

**TasteProfile mapping:**
- `heroStyle: "text-dominant"`, `typographyTraits.scale: "dramatic"`, `layoutBias.whitespaceIntent: "dramatic"`

---

## 5. Ambient Video Hero

**Visual:** Looping, atmospheric video fills the background. Low motion intensity — the video provides texture and mood, not information. Text is overlaid.

**When to use:**
- Product has a physical or spatial dimension (hardware, spaces, events)
- Brand needs to communicate quality of experience before features
- Never use for developer tools — wrong register

**Archetypes:** culture-brand, some editorial-brand

**Layout specs:**
- Video: `position: absolute; width: 100%; height: 100%; object-fit: cover`
- Scrim: `background: linear-gradient(transparent, rgba(0,0,0,0.4))` — protects text legibility
- Text: positioned in lower third or center
- `autoplay muted loop playsinline` attributes required

**Typography behavior:**
- White or near-white text on dark scrim
- Heading: 60–100px, bold weight
- Minimal copy — let the video communicate mood

**TasteProfile mapping:**
- `heroStyle: "full-bleed"`, `imageTreatment.style: "atmospheric"`, `colorBehavior.mode: "dark"`

---

## 6. Minimal Text Hero (Manifesto Style)

**Visual:** Single, short, powerful statement. Extremely large type. Almost nothing else. The hero is a declaration.

**When to use:**
- Brand has a strong, distinctive voice
- The positioning can be communicated in 5–10 words
- Creative, editorial, or culture brand with confidence

**Archetypes:** editorial-brand, creative-portfolio, experimental

**Layout specs:**
- Full-width heading: `font-size: clamp(80px, 14vw, 200px)`
- Left-aligned, flush to grid, or centered as a deliberate choice
- Vertical padding: 160–240px
- Nothing else in the hero — the statement stands alone

**Typography behavior:**
- One line, possibly two
- No subheading — the statement doesn't need explanation in the hero
- CTA appears below the fold or as a sticky element

**TasteProfile mapping:**
- `heroStyle: "text-dominant"`, `typographyTraits.scale: "dramatic"`, `typographyTraits.contrast: "extreme"`

---

## 7. Editorial Spread Hero

**Visual:** Magazine-layout logic applied to a web hero. Asymmetric composition — large typography + editorial image, not aligned to standard columns. Feels like a spread, not a web template.

**When to use:**
- Brand has strong editorial identity
- Photography or image direction is art-directed at a high level
- The site is the brand expression, not just a product page

**Archetypes:** editorial-brand, culture-brand

**Layout specs:**
- Custom grid: e.g., 60/40 split with image bleeding past container
- Type may overlap image at one edge (controlled, intentional)
- Asymmetric padding — may have 80px left, 0px right
- Heading may run across both columns at display scale

**Typography behavior:**
- Heading: display scale, potentially overlapping image
- Caption-level text near the image for editorial flavor
- CTA may be typographic (underlined text link) rather than a button

**TasteProfile mapping:**
- `heroStyle: "full-bleed"`, `layoutBias.gridBehavior: "editorial"`, `layoutBias.sectionFlow: "editorial-grid"`

---

## 8. Card-Based Hero (Feature Preview)

**Visual:** Grid of cards below or alongside a headline, showing feature previews, recent work, or key product areas. The hero doubles as a feature preview.

**When to use:**
- Product has multiple distinct, equally important features
- Dashboard or tool products where showing many capabilities matters
- B2B products with feature-heavy decisions

**Archetypes:** premium-saas (restrained variant), minimal-tech

**Layout specs:**
- Headline above card grid, 48px gap
- Card grid: 2–3 columns, `gap: 16–24px`
- Cards: consistent size, subtle border, minimal interior padding
- Max-width: 1200–1440px

**Typography behavior:**
- Headline: 48–72px (smaller than other hero types — the cards share visual weight)
- Card headings: 16–20px, medium weight
- Card body: 14–15px

**TasteProfile mapping:**
- `heroStyle: "contained"`, `layoutBias.density: "balanced"`, `layoutBias.gridBehavior: "strict"`
