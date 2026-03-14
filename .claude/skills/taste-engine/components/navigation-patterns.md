# Navigation Patterns — Component Reference

Defines 5 navigation patterns used across Studio OS site generation. Each maps to specific archetypes and TasteProfile values.

---

## 1. Minimal Sticky

**Visual:** Thin bar, fixed at top. Logo left, 2–4 navigation links center or right, single CTA button far right. Shrinks slightly on scroll (optional). No background until user scrolls — then a subtle background blur appears.

**When to use:**
- The product needs lightweight navigation that doesn't compete with hero content
- Most appropriate when the hero message needs full visual attention

**Archetypes:** premium-saas, minimal-tech

**Layout specs:**
- Height: 64px (default), 56px (scrolled / compact)
- Container: max-width constrained, matching page grid
- Logo: 20–24px height
- Nav links: 14–15px, normal weight, 24–32px gap between
- CTA button: `padding: 8px 16px`, `border-radius: 6–8px`
- Scrolled state: `background: rgba(10,10,10,0.85); backdrop-filter: blur(12px)`

**TasteProfile mapping:**
- `ctaTone.shape: "subtle-radius"` or `"sharp"`, `ctaTone.hierarchy: "primary-dominant"`
- Dark mode: background `rgba(10,10,10,0.85)`, text `#EDEDED`
- Light mode: background `rgba(250,250,250,0.9)`, text `#1A1A1A`

**Do not use when:**
- Site has fewer than 2 page sections (unnecessary navigation complexity)
- Archetype is experimental (navigation should be part of the design expression)

---

## 2. Transparent Overlay

**Visual:** Navigation floats over the hero section with no visible background. Text is white (on dark or media hero). Background appears only when scrolling begins.

**When to use:**
- Full-bleed media or atmospheric hero where navigation must not interrupt the visual
- Culture brands and editorial brands with strong hero imagery

**Archetypes:** culture-brand, editorial-brand

**Layout specs:**
- `position: absolute; top: 0; left: 0; width: 100%; z-index: 10`
- Text: white or very light (`#FAFAFA`, `#E8E8E8`)
- Logo: white variant required
- On scroll: transition to solid or blurred background, 300ms ease
- Links: 13–15px, tracked slightly (letter-spacing: 0.02–0.04em)

**TasteProfile mapping:**
- `colorBehavior.mode: "dark"` (for transparent state), `imageTreatment.style: "editorial"` or `"atmospheric"`

---

## 3. Sidebar Navigation

**Visual:** Navigation runs vertically on the left side of the viewport. Content occupies the remaining width. The nav is persistent and doesn't scroll with content (or has its own scroll for long nav structures).

**When to use:**
- Documentation sites or multi-section sites with many navigation items
- Dashboard products
- Rarely on marketing sites — context-dependent

**Archetypes:** minimal-tech (documentation), experimental (as design statement)

**Layout specs:**
- Sidebar width: 240–280px (navigation-heavy) or 64–80px (icon-only, collapsed)
- Content area: `margin-left: [sidebar-width]`
- Nav items: 13–15px, 36–44px item height with comfortable padding
- Sticky: `position: sticky; top: 0; height: 100vh; overflow-y: auto`

**TasteProfile mapping:**
- `layoutBias.density: "balanced"`, `layoutBias.gridBehavior: "strict"`

---

## 4. Hidden / Hamburger

**Visual:** No visible navigation links — only a logo and a hamburger/menu trigger. Clicking reveals a full-screen overlay or off-canvas panel with navigation items at large scale.

**When to use:**
- Intentionally narrative sites where you want the user to focus on content
- Creative portfolios where navigation is a design moment
- Experimental sites where the menu reveal is part of the experience

**Archetypes:** creative-portfolio, experimental, some culture-brand

**Layout specs:**
- Trigger: 44×44px minimum touch target
- Overlay: `position: fixed; inset: 0; z-index: 100`
- Nav items in overlay: 48–80px font size, vertical list or typographic arrangement
- Transition: scale + fade or clip-path reveal, 400–600ms ease

**Typography behavior in overlay:**
- Large scale — navigation IS a typographic composition when open
- Each item is a button at headline scale

**TasteProfile mapping:**
- `layoutBias.whitespaceIntent: "dramatic"`, `typographyTraits.scale: "dramatic"` (in overlay context)

---

## 5. Editorial Top Bar

**Visual:** Narrow top bar with a strong typographic identity. May include a scrolling ticker, section label, or date. Feels like the masthead of a magazine or publication.

**When to use:**
- Editorial brand contexts where the site is read like a publication
- Situations where the nav needs to set an editorial tone before the content begins

**Archetypes:** editorial-brand, some creative-portfolio

**Layout specs:**
- Height: 48–56px
- May include: publication name/logo + current date + section links + subscribe CTA
- Font: editorial — either a serif or a geometric with strong tracking
- Border-bottom: 1px solid, used as a structural separator (not decorative)
- Text: 13–14px, tight letter-spacing on section labels

**Typography behavior:**
- If including a ticker/scrolling text: `animation: ticker linear infinite; white-space: nowrap`
- Section links: uppercase, tracked (letter-spacing: 0.08–0.1em), 12–13px

**TasteProfile mapping:**
- `layoutBias.sectionFlow: "editorial-grid"`, `typographyTraits.headingTone: "editorial"`, `ctaTone.style: "editorial"`
