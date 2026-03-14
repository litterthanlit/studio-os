# Section Patterns — Component Reference

Defines patterns for page section types used in Studio OS site generation. Each section type maps to archetypes and TasteProfile values.

---

## 1. Feature Section (Alternating)

**Visual:** Series of sections where each feature alternates the image/media position — left/right, left/right. Creates rhythm without monotony. The most common pattern in premium-saas sites.

**When to use:**
- 3–5 features that each deserve their own visual and copy
- When the product has distinct capabilities that benefit from individual attention

**Archetypes:** premium-saas, minimal-tech, editorial-brand

**Layout specs:**
- Container: max-width 1100–1280px, centered
- Each feature row: `display: grid; grid-template-columns: 1fr 1fr; gap: 80–120px; align-items: center`
- Alternates: odd rows = image left, text right. Even = text left, image right
- Section padding: 100–140px vertical
- Media: product screenshot or diagram in bordered, subtle-shadow container

**Typography behavior:**
- Feature headline: 28–40px, strong weight
- Body: 17–19px, 5–7 line maximum per feature
- Optional label/eyebrow: 12–13px, uppercase, accent color, 16px gap above headline

**TasteProfile mapping:**
- `layoutBias.rhythm: "alternating"`, `layoutBias.density: "spacious"`, `heroStyle: N/A (section-level pattern)`

---

## 2. Comparison / Versus Section

**Visual:** Side-by-side comparison between two states (before/after, old way/new way, competitor/product). Often used in premium-saas and minimal-tech to establish positioning.

**When to use:**
- When the product's differentiation is clearest in contrast to the status quo
- Positioning pages, landing pages with a specific competitive framing

**Archetypes:** premium-saas, minimal-tech

**Layout specs:**
- Two columns: `grid-template-columns: 1fr 1fr; gap: 24px`
- Column headers: "Before" / "After" or competitor name / product name
- Each column: border, subtle background differentiation (e.g., one dark, one light)
- "After" / product column: accent border or accent glow, slightly elevated z-index

**Typography behavior:**
- Column header: 14–16px, uppercase, tracked
- List items: 15–17px, with checkmarks or X marks using accent/red colors
- Product column text may be slightly bolder than competitor column

**TasteProfile mapping:**
- `layoutBias.gridBehavior: "strict"`, `ctaTone.hierarchy: "primary-dominant"`

---

## 3. Bento Grid

**Visual:** Irregular grid of feature cards at different sizes — some full width, some half, some third. Creates visual interest through size variation while maintaining grid discipline.

**When to use:**
- 4–8 features of varying importance
- When features have different types of visual content (screenshots, text, icons, stats)
- Avoid when all features are equally important — creates false hierarchy

**Archetypes:** premium-saas

**Layout specs:**
- Grid: CSS grid with named areas or explicit `grid-column/row` spans
- Cell sizes: 2×2 (large), 1×2 (tall), 2×1 (wide), 1×1 (small)
- Consistent gap: 16–24px
- Cell padding: 24–40px internal
- Cells: same border-radius across all cells (4–12px), consistent border treatment

**Typography behavior:**
- Large cell headings: 24–32px
- Small cell headings: 16–20px
- Body text proportional to cell size

**TasteProfile mapping:**
- `layoutBias.gridBehavior: "strict"` (grid discipline is essential), `layoutBias.density: "balanced"`

**Failure mode:** Bento with equal-size cards = not a bento, just a card grid. Hierarchy through size is the point.

---

## 4. Timeline / Process

**Visual:** Vertical or horizontal step sequence. Each step is numbered, labeled, and described. Used to explain workflow, onboarding, or how a product works.

**When to use:**
- Product has a clear sequential workflow
- Onboarding or implementation process needs explanation
- "How it works" sections

**Archetypes:** minimal-tech, premium-saas, editorial-brand

**Layout specs (vertical):**
- Single column or staggered 60/40 layout
- Step number: large, accent-colored or desaturated
- Connecting line: 1px, vertical, between steps
- Step spacing: 64–100px between steps

**Layout specs (horizontal):**
- 3–5 steps max; beyond that use vertical
- Each step: equal width column
- Connecting line: horizontal, between numbered nodes
- Mobile: collapses to vertical automatically

**Typography behavior:**
- Step number: 12–14px, monospaced or tracked, accent color
- Step heading: 20–24px
- Step body: 15–17px

**TasteProfile mapping:**
- `layoutBias.rhythm: "uniform"`, `layoutBias.density: "balanced"`

---

## 5. Full-Width Break

**Visual:** A section that deliberately breaks from the standard content column — extends to full viewport width, often with a strong background color/image or a large typographic statement. Used to interrupt the rhythm and create a visual reset.

**When to use:**
- Between content-heavy sections to provide visual relief
- For a key statement, metric, or testimonial that deserves maximum impact
- Before or after the hero, at natural narrative breaks

**Archetypes:** editorial-brand, culture-brand, premium-saas (restrained variant)

**Layout specs:**
- `width: 100vw; margin-left: calc(-50vw + 50%)` (break out of container)
- Padding: 100–160px vertical
- Content inside: still max-width constrained
- May have: solid background, subtle texture, or accent color fill

**Typography behavior:**
- Large quotation: 40–80px, often italic serif
- Large stat: 80–120px numerals, supporting label below at 16–18px
- Attribution or label: 13–14px, muted opacity

**TasteProfile mapping:**
- `layoutBias.whitespaceIntent: "dramatic"`, `layoutBias.sectionFlow: "stacked"`
