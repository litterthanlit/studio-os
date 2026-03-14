# Layout Terms — Vocabulary Reference

This file defines precise layout vocabulary used in the TasteProfile. These definitions translate directly to CSS and layout behavior. Use them consistently across all TasteProfile outputs.

---

## Density

### `spacious`
- Section vertical padding: ≥ 120px (desktop), ≥ 80px (mobile)
- Element gaps within sections: ≥ 48px
- Max content width: typically 1100–1280px
- Reads as: breathing room, premium, confident
- Associated archetypes: premium-saas, creative-portfolio, editorial-brand

### `balanced`
- Section vertical padding: 80–120px (desktop), 60–80px (mobile)
- Element gaps within sections: 24–48px
- Max content width: typically 1200–1440px
- Reads as: efficient, professional, modern
- Associated archetypes: minimal-tech, culture-brand

### `dense`
- Section vertical padding: ≤ 80px (desktop), ≤ 48px (mobile)
- Element gaps within sections: 12–24px
- Content may run edge-to-edge in subsections
- Reads as: information-rich, editorial, high-frequency
- Associated archetypes: culture-brand (aggressive variant), experimental

---

## Rhythm

### `uniform`
- All sections have similar vertical weight and padding
- Visual cadence is consistent — no sudden scale changes
- Reads as: disciplined, systematic, technical
- Associated archetypes: minimal-tech

### `alternating`
- Sections alternate between visually heavy and visually light
- Typical pattern: feature section → spacer → feature section → spacer
- Creates a breathing rhythm without dramatic variance
- Associated archetypes: premium-saas, culture-brand, editorial-brand

### `progressive`
- Sections build in visual weight as the page descends
- Hero may be minimal; later sections more dense and content-rich
- Creates narrative momentum
- Associated archetypes: editorial-brand, creative-portfolio

### `asymmetric`
- No predictable pattern — section weights vary by design decision
- Some sections feel abrupt, others expansive
- Intentional disruption of rhythm as a compositional tool
- Associated archetypes: creative-portfolio, experimental

---

## Hero Style

### `full-bleed`
- Hero element (image or video) extends to full viewport width and height
- No padding constraint on the primary visual
- Text overlaid or positioned below
- CSS: `width: 100vw; height: 100vh; object-fit: cover`

### `contained`
- Hero content constrained to max-width container (typically 1100–1280px)
- Margins visible on desktop; feels composed, not expansive
- Product screenshots or UI content often used here
- Associated archetypes: premium-saas, minimal-tech

### `split`
- Two-column layout: text left, media right (or inverse)
- Both columns may have independent alignment
- Desktop-first pattern; collapses on mobile
- CSS: `display: grid; grid-template-columns: 1fr 1fr`

### `text-dominant`
- Hero is primarily typographic — no images or small/background-only images
- Typography scale is extreme: heading ≥ 80px, often 100–160px
- Associated archetypes: editorial-brand, minimal-tech, creative-portfolio

### `media-dominant`
- Product screenshot, video, or large image is the primary visual element
- Text is present but secondary in visual weight
- Associated archetypes: premium-saas (product screenshot hero)

---

## Section Flow

### `stacked`
- Sections are discrete, full-width blocks stacked vertically
- No visual overlap between sections
- Most common pattern; clean separation
- CSS: `display: flex; flex-direction: column`

### `overlapping`
- Section elements visually extend into adjacent sections
- Achieved via negative margins, sticky positioning, or z-index layering
- Requires precise control — high execution risk
- Associated archetypes: experimental

### `interlocking`
- Content from adjacent sections appears to interlock compositionally
- Elements from section A appear to "reach into" section B's space
- More structural than overlapping — follows a deliberate system
- Associated archetypes: experimental, editorial-brand (restrained variant)

### `editorial-grid`
- Sections follow a magazine-like multi-column grid
- Content doesn't fill every cell — negative space is designed
- Large typographic anchors anchor grid positions
- Associated archetypes: editorial-brand, creative-portfolio

---

## Grid Behavior

### `strict`
- All elements align to an underlying 12 or 16-column grid
- Consistent gutters (typically 24–32px)
- No elements break the grid boundary
- CSS: `display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px`

### `fluid`
- Content adapts to viewport without fixed column constraints
- Flexible containers, CSS clamp() for type sizes
- Reads as natural, not engineered

### `broken`
- Elements intentionally extend beyond grid columns
- Large images bleed past content width
- Oversized type breaks the text column
- Requires the underlying grid to exist — the breaking has meaning only if there's a rule to break

### `editorial`
- Custom column counts per section (not a consistent 12-col system)
- May use 2-col, 3-col, asymmetric splits within the same page
- Grid is an editorial tool, not a system constraint

---

## Whitespace Intent

### `breathing`
- Space between elements serves readability and reduces density
- Not a design statement — a utility decision
- Reads as: comfortable, accessible

### `structural`
- Whitespace creates section hierarchy — it is the section divider
- No visible divider lines needed; space communicates breaks
- Associated archetypes: premium-saas, minimal-tech

### `dramatic`
- Space is compositional — large empty areas are design choices
- Creates tension, elevates the non-empty elements
- Associated archetypes: editorial-brand, creative-portfolio, experimental

### `minimal`
- Very little whitespace — content is dense, tightly packed
- Space appears only where strictly necessary for readability
- Associated archetypes: culture-brand (aggressive), dense product dashboards
