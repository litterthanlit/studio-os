# Typography Terms — Vocabulary Reference

Precise definitions for typographic terminology used in TasteProfile outputs. Includes font recommendations per tone, scale specifications, and pairing logic.

---

## Type Scale

### `compressed`
- Heading 1: 32–48px
- Heading 2: 24–32px
- Body: 15–16px
- Leading (body): 1.4–1.5
- Reads as: information-dense, utilitarian, technical
- Use when: dashboards, data tools, developer docs

### `moderate`
- Heading 1: 48–72px
- Heading 2: 32–48px
- Body: 16–18px
- Leading (body): 1.5–1.6
- Reads as: standard, professional, accessible
- Use when: general SaaS, most B2B, product marketing

### `expanded`
- Heading 1: 72–96px
- Heading 2: 48–64px
- Body: 17–20px
- Leading (body): 1.6–1.7
- Reads as: premium, confident, spacious
- Use when: premium-saas, portfolio sites, brand-forward products

### `dramatic`
- Heading 1: 96px–200px (viewport-relative, often clamp-based)
- Heading 2: 64–96px
- Body: 18–22px
- Leading (body): 1.6–1.8
- Reads as: editorial, expressive, architectural
- Use when: editorial-brand, creative-portfolio, culture-brand, experimental
- CSS example: `font-size: clamp(80px, 12vw, 180px)`

---

## Heading Tone

### `geometric`
- Constructed letterforms based on circles, squares, and triangles
- High x-height, even stroke width, minimal contrast
- Reads as: technical, modern, systematic, precise
- Fonts: Geist, Space Grotesk, Neue Haas Grotesk, Inter, DM Sans, Circular
- Associated archetypes: premium-saas, minimal-tech

### `technical`
- Neutral grotesque, often monospaced influence
- Designed for code and data environments
- Low personality, high legibility, implicit authority
- Fonts: IBM Plex Sans, Suisse Int'l, Aktiv Grotesk, Helvetica Now, JetBrains Mono (as display)
- Associated archetypes: minimal-tech

### `editorial`
- High contrast between thick and thin strokes
- Optical refinement for large display sizes
- Often serif or serif-influenced; reads like type from a magazine or newspaper
- Fonts: Newsreader, Canela, Playfair Display, Portrait, GT Sectra, Tiempos Headline
- Associated archetypes: editorial-brand, creative-portfolio

### `display`
- Maximally expressive, designed for large sizes only
- High personality, often condensed, extended, or unusual proportion
- Not suitable for body text; purpose-built for headlines
- Fonts: Druk, Compakt, Caslon Deco, PP Editorial New, Domaine Display, Neue Machina
- Associated archetypes: culture-brand, experimental, creative-portfolio

### `humanist`
- Based on calligraphic tradition; more optical, less constructed
- Warmth and rhythm over geometric precision
- Reads as: friendly, warm, trustworthy, accessible
- Fonts: Source Sans, Gill Sans, Fira Sans, Trebuchet, Myriad, Nunito
- Associated archetypes: editorial-brand (warm variant), consumer products

---

## Body Tone

### `neutral`
- Optimized for legibility at small sizes
- Minimal personality; doesn't compete with headings
- Reads as: professional, efficient, trustworthy
- Fonts: Inter, DM Sans, Geist, Plus Jakarta Sans

### `technical`
- Often monospaced or mono-influenced
- Signals code, data, precision
- Fonts: JetBrains Mono, IBM Plex Mono, Fira Code, iA Writer Mono

### `warm`
- Humanist characteristics at text sizes; slightly informal
- Creates approachability without sacrificing legibility
- Fonts: Lora, Source Serif, Nunito, DM Serif Text

### `literary`
- Serif, designed for long-form reading
- High x-height, generous leading, optical comfort
- Fonts: Newsreader, Freight Text, Palatino, EB Garamond, Cormorant Garamond

---

## Type Contrast

### `low`
- Heading and body sizes differ by < 2x
- Weight differentiation is minimal
- Reads as: flat, calm, utilitarian

### `medium`
- Heading and body sizes differ by 2–4x
- Clear weight differentiation between levels
- Standard contrast for most marketing sites

### `high`
- Heading and body sizes differ by 4–6x
- Strong weight variation; headings often bold or black
- Reads as: confident, hierarchical, premium

### `extreme`
- Heading and body sizes differ by > 6x
- Some elements may be supergraphic (display-scale typography)
- Reads as: editorial, expressive, architectural

---

## Case Preference

### `mixed`
- Headlines use title case or sentence case
- Natural reading pattern; most common
- Reads as: neutral, modern

### `uppercase-headings`
- Headings are set in ALL CAPS; body remains mixed case
- Creates graphic tension without full uppercase commitment
- Common in culture-brand and editorial-brand

### `all-uppercase`
- Everything above body text is set in ALL CAPS
- Extremely graphic — the type becomes texture
- Associated archetypes: culture-brand, experimental

### `all-lowercase`
- Deliberate lowercase across headings
- Signals informality, accessibility, or anti-authority attitude
- Associated archetypes: certain creative-portfolio and culture-brand variants

---

## Recommended Pairings (by Archetype)

### premium-saas
- Inter + Inter (all-in on geometric)
- Geist + Geist Mono (Vercel's system)
- Space Grotesk + DM Sans
- Neue Haas Grotesk + Neue Haas Grotesk (weight contrast only)

### editorial-brand
- Newsreader + Inter
- Canela + Suisse Intl
- GT Sectra + GT America
- Playfair Display + Source Sans 3
- Portrait + Helvetica Now

### minimal-tech
- Inter + JetBrains Mono
- IBM Plex Sans + IBM Plex Mono
- Geist + Geist Mono
- Suisse Intl + iA Writer Mono

### creative-portfolio
- Neue Haas Grotesk + Freight Display
- Favorit + Mercury
- Aktiv Grotesk + Canela
- PP Editorial New + Neue Montreal

### culture-brand
- Druk + Grotesk MT
- Compakt + Helvetica Neue
- Acumin Pro Condensed + Acumin Pro
- F Grotesk + F Grotesk (weight-only system)

### experimental
- GT Sectra + GT America
- PP Editorial New + PP Neue Machina
- Styrene + Untitled Sans
- Founders Grotesk Condensed + Founders Grotesk
