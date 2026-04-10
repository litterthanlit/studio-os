# Primitives Gap Spec — Geist/shadcn Parity Tranche

**From:** COO (gap analysis session)
**To:** Implementing COO / Implementer agents
**Date:** 2026-04-09
**Context:** CEO requested study of component depth in Geist Design System (vercel.com/geist) and shadcn/ui (ui.shadcn.com). This spec documents what we're missing and defines the next 8 templates + prompt updates to close the gap.

---

## 1. Current State

### What exists (18 templates)


| ID                         | Name                 | Category   |
| -------------------------- | -------------------- | ---------- |
| `template-hero`            | Hero                 | Layout     |
| `template-split`           | Split Content        | Layout     |
| `template-features`        | Features Grid        | Content    |
| `template-quote`           | Quote Block          | Content    |
| `template-proof`           | Proof Row            | Content    |
| `template-cta`             | CTA Banner           | Action     |
| `template-footer`          | Footer               | Action     |
| `template-btn-primary`     | Button — Primary     | Primitives |
| `template-btn-outline`     | Button — Outline     | Primitives |
| `template-btn-ghost`       | Button — Ghost       | Primitives |
| `template-btn-destructive` | Button — Destructive | Primitives |
| `template-btn-secondary`   | Button — Secondary   | Primitives |
| `template-link-cta`        | Link — CTA           | Primitives |
| `template-icon-label-row`  | Icon + label row     | Primitives |
| `template-badge`           | Badge                | Primitives |
| `template-card`            | Card                 | Primitives |
| `template-input-row`       | Input row            | Primitives |
| `template-separator`       | Separator            | Primitives |


### What exists in prompt (composition recipes in `design-tree-prompt.ts`)

8 named SaaS recipes: Top Nav, Hero, Logo Strip, Features 3-up, Testimonials, Pricing Tiers, Closing CTA Band, Footer. Plus 5 archetype-specific grammars (editorial-brand, minimal-tech, creative-portfolio, culture-brand, experimental).

### Token system (`PRODUCT_PRIMITIVE_STYLE_TOKENS`)

```
accent: #4B57DB    accentHover: #3D49C7    accentLight: #D1E4FC
border: #E5E5E0    borderSubtle: #EFEFEC    text: #1A1A1A
muted: #6B6B6B     surface: #FFFFFF         canvas: #FAFAF8
destructive: #EF4444    destructiveSurface: #FEF2F2
```

New tokens needed for this tranche:

```
success: #22C55E        successSurface: #F0FDF4
warning: #F59E0B        warningSurface: #FFFBEB
info: #3B82F6           infoSurface: #EFF6FF
```

---

## 2. Gap Analysis Summary

Geist ships ~50 components. shadcn/ui ships ~72. Studio OS has 18 templates. The raw count isn't the issue — we're a generative tool, not a component library. The issue is **category blindness**: entire component families that both reference libraries cover but we have zero representation for.


| Category          | Geist                                                       | shadcn                                                   | Studio OS                        | Gap severity           |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------------------- | -------------------------------- | ---------------------- |
| Navigation        | Menu, Breadcrumb, Tabs                                      | Menubar, Navigation Menu, Breadcrumb, Sidebar, Tabs      | 0 templates (prompt recipe only) | **Critical**           |
| Data Display      | Table, Description, Entity, Skeleton                        | Table, Data Table, Card, Skeleton                        | 1 (Card only)                    | **High**               |
| Feedback / Status | Note, Error, Toast, Gauge, Progress, Spinner                | Alert, Toast, Progress, Skeleton                         | 0                                | **High**               |
| Form Controls     | Input, Textarea, Select, Checkbox, Switch, Slider, Combobox | Input, Textarea, Select, Checkbox, Switch, Radio, Slider | 1 (Input Row only)               | **Medium**             |
| Overlay / Surface | Modal, Drawer, Sheet                                        | Dialog, Drawer, Sheet, Popover                           | 0                                | **Low** (static pages) |
| Status / Loading  | Loading Dots, Spinner, Status Dot                           | Spinner, Skeleton                                        | 0                                | **Medium**             |


**Bottom line:** We're deep on marketing layout (hero, features, CTA, footer) and button variants, but have almost nothing for product UI vocabulary. The AI can generate landing pages but struggles with dashboards, app interfaces, documentation pages, or any design that needs to look like software.

---

## 3. CEO-Flagged Items (Priority Override)

Last session the CEO specifically requested:

1. **KPI Stat Card** — number + label + optional trend delta. Not delivered.
2. **Inline Alert / Note** — colored banner with icon slot + message. Not delivered.

These two lead the tranche regardless of category ranking.

---

## 4. New Templates — Complete Specifications

All 8 templates follow the existing pattern in `design-component-library.ts`:

- Factory function returning `DesignComponent`
- Fresh `uid()` calls for every node ID
- `source: "template"`, `version: 1`
- Use `TOK` (alias for `PRODUCT_PRIMITIVE_STYLE_TOKENS`) for all colors
- Wrapped in an outer frame with canvas background + padding (matches existing pattern)

### 4.1 `template-stat-card` — KPI Stat Card

**Category:** `"Primitives"`
**ID:** `"template-stat-card"`
**Name:** `"Stat Card"`

**Structure:**

```
frame "Stat Card" (outer wrapper — fill, hug, flex col, padding 16/24, bg canvas)
  └─ frame "Card Surface" (fill, hug, flex col, gap 4, padding 20, bg surface, border TOK.border, borderWidth 1, borderRadius 6)
       ├─ text "Label" (fontSize 12, fontWeight 500, foreground TOK.muted, letterSpacing 0.04, textTransform uppercase concept — use letterSpacing 0.04)
       ├─ text "Value" (fontSize 36, fontWeight 700, foreground TOK.text, lineHeight 1.1)
       └─ frame "Trend Row" (flex row, gap 6, alignItems center)
            ├─ frame "Trend Indicator" (width 18, height 18, borderRadius 999, bg #F0FDF4 [successSurface])
            └─ text "Delta" (fontSize 13, fontWeight 500, foreground #22C55E [success])
                content: { text: "+12.3%" }
```

**Content defaults:**

- Label: `"Monthly Revenue"`
- Value: `"$48,200"`
- Delta: `"+12.3%"`

### 4.2 `template-alert` — Inline Alert / Note

**Category:** `"Primitives"`
**ID:** `"template-alert"`
**Name:** `"Alert"`

**Structure:**

```
frame "Alert" (outer wrapper — fill, hug, flex col, padding 16/24, bg canvas)
  └─ frame "Alert Surface" (fill, hug, flex row, gap 12, alignItems flex-start, padding 16, bg infoSurface #EFF6FF, borderColor info #3B82F6, borderWidth 1, borderRadius 6)
       ├─ frame "Icon Slot" (width 20, height 20, flexShrink 0, borderRadius 999, bg info #3B82F6)
       └─ frame "Alert Content" (flex col, gap 4, width fill)
            ├─ text "Title" (fontSize 14, fontWeight 600, foreground TOK.text)
            │    content: { text: "Heads up" }
            └─ text "Message" (fontSize 13, fontWeight 400, foreground TOK.muted, lineHeight 1.5)
                 content: { text: "This is an informational alert. Replace with your message." }
```

**Design note:** Uses `info` token by default. Implementer should NOT create separate warning/success/error alert templates — one template is enough. The AI and user can recolor the surface/border/icon to match intent. The prompt update (§5) teaches the model the color mappings.

### 4.3 `template-nav-bar` — Navigation Bar

**Category:** `"Layout"`
**ID:** `"template-nav-bar"`
**Name:** `"Nav Bar"`

**Structure:**

```
frame "Nav Bar" (fill, hug, flex row, alignItems center, justifyContent space-between, padding 16/24, bg surface, borderColor TOK.border, borderWidth 0 0 1 0 [bottom only — use borderWidth 1, and style as bottom border via the existing system])
  ├─ text "Logo" (fontSize 15, fontWeight 700, foreground TOK.text)
  │    content: { text: "Acme" }
  ├─ frame "Nav Links" (hug, hug, flex row, gap 28, alignItems center)
  │    ├─ text "Link 1" (fontSize 14, fontWeight 400, foreground TOK.muted) content: { text: "Features" }
  │    ├─ text "Link 2" (fontSize 14, fontWeight 400, foreground TOK.muted) content: { text: "Pricing" }
  │    └─ text "Link 3" (fontSize 14, fontWeight 400, foreground TOK.muted) content: { text: "Docs" }
  └─ frame "Nav Actions" (hug, hug, flex row, gap 12, alignItems center)
       ├─ button "Log In" (ghost style — transparent bg, foreground TOK.muted, padding 8/12, borderRadius 4, fontSize 14, fontWeight 500, borderWidth 0)
       └─ button "Sign Up" (primary style — bg TOK.accent, foreground #FFFFFF, padding 8/16, borderRadius 4, fontSize 14, fontWeight 600)
```

**Design note:** This is the most visible gap. The nav composition recipe already exists in `design-tree-prompt.ts` but having a concrete template means users can also drag one in manually. Bottom border: use `borderWidth: 1, borderColor: TOK.border` on the outer frame — the renderer draws all-sides border which is close enough.

### 4.4 `template-avatar` — Avatar

**Category:** `"Primitives"`
**ID:** `"template-avatar"`
**Name:** `"Avatar"`

**Structure:**

```
frame "Avatar" (outer wrapper — fill, hug, flex row, gap 12, alignItems center, padding 16/24, bg canvas)
  ├─ frame "Avatar Circle" (width 40, height 40, flexShrink 0, borderRadius 999, bg TOK.accentLight, display flex, alignItems center, justifyContent center)
  │    └─ text "Initials" (fontSize 15, fontWeight 600, foreground TOK.accent)
  │         content: { text: "JD" }
  └─ frame "Avatar Meta" (flex col, gap 2)
       ├─ text "Name" (fontSize 14, fontWeight 600, foreground TOK.text) content: { text: "Jane Doe" }
       └─ text "Role" (fontSize 12, fontWeight 400, foreground TOK.muted) content: { text: "Product Designer" }
```

**Design note:** Avatar with meta row beside it. Useful standalone, in testimonial cards, in team grids. The AI should be taught to use this inside Card primitives for testimonial sections.

### 4.5 `template-tabs` — Tab Bar

**Category:** `"Primitives"`
**ID:** `"template-tabs"`
**Name:** `"Tab Bar"`

**Structure:**

```
frame "Tab Bar" (outer wrapper — fill, hug, flex col, gap 0, padding 16/24, bg canvas)
  └─ frame "Tabs Row" (fill, hug, flex row, gap 0, alignItems stretch, borderColor TOK.border, borderWidth 0 0 1 0 [bottom border])
       ├─ frame "Tab Active" (hug, hug, flex, alignItems center, justifyContent center, padding 10/16, borderColor TOK.accent, borderWidth 0 0 2 0 [active indicator])
       │    └─ text "Label" (fontSize 14, fontWeight 600, foreground TOK.text) content: { text: "Overview" }
       ├─ frame "Tab" (hug, hug, flex, alignItems center, justifyContent center, padding 10/16)
       │    └─ text "Label" (fontSize 14, fontWeight 400, foreground TOK.muted) content: { text: "Features" }
       └─ frame "Tab" (hug, hug, flex, alignItems center, justifyContent center, padding 10/16)
            └─ text "Label" (fontSize 14, fontWeight 400, foreground TOK.muted) content: { text: "Pricing" }
```

**Design note:** Static tab bar — no interactivity needed. Bottom border on the active tab as the indicator. The AI can place content frames below this to simulate tabbed sections. Both Geist and shadcn use underline-style active indicators.

### 4.6 `template-accordion-item` — Accordion / FAQ Item

**Category:** `"Primitives"`
**ID:** `"template-accordion-item"`
**Name:** `"Accordion Item"`

**Structure:**

```
frame "Accordion Item" (outer wrapper — fill, hug, flex col, padding 16/24, bg canvas)
  └─ frame "Accordion Surface" (fill, hug, flex col, gap 0, borderColor TOK.border, borderWidth 0 0 1 0)
       ├─ frame "Accordion Header" (fill, hug, flex row, alignItems center, justifyContent space-between, padding 16/0)
       │    ├─ text "Question" (fontSize 15, fontWeight 600, foreground TOK.text)
       │    │    content: { text: "What makes this different?" }
       │    └─ text "Chevron" (fontSize 16, fontWeight 400, foreground TOK.muted)
       │         content: { text: "+" }
       └─ frame "Accordion Body" (fill, hug, flex col, padding 0 0 16 0)
            └─ text "Answer" (fontSize 14, fontWeight 400, foreground TOK.muted, lineHeight 1.6)
                 content: { text: "A concise answer to the question. Keep it focused and valuable." }
```

**Design note:** This is a single accordion item — expand state is shown (body visible). The AI should stack 4-6 of these for an FAQ section. The "+" chevron is a text approximation since we don't have SVG icons. The prompt recipe (§5) teaches the AI to compose FAQ sections from repeated accordion items.

### 4.7 `template-table-row` — Table Row

**Category:** `"Primitives"`
**ID:** `"template-table-row"`
**Name:** `"Table Row"`

**Structure:**

```
frame "Table Row" (outer wrapper — fill, hug, flex col, padding 16/24, bg canvas)
  └─ frame "Table" (fill, hug, flex col, gap 0, borderColor TOK.border, borderWidth 1, borderRadius 6, overflow hidden)
       ├─ frame "Header Row" (fill, hug, flex row, gap 0, bg TOK.borderSubtle, padding 0)
       │    ├─ frame "Cell" (width fill, hug, flex, alignItems center, padding 10/16)
       │    │    └─ text "Header" (fontSize 12, fontWeight 600, foreground TOK.muted, letterSpacing 0.03) content: { text: "Name" }
       │    ├─ frame "Cell" (width fill, hug, flex, alignItems center, padding 10/16)
       │    │    └─ text "Header" (fontSize 12, fontWeight 600, foreground TOK.muted, letterSpacing 0.03) content: { text: "Status" }
       │    └─ frame "Cell" (width fill, hug, flex, alignItems center, padding 10/16)
       │         └─ text "Header" (fontSize 12, fontWeight 600, foreground TOK.muted, letterSpacing 0.03) content: { text: "Amount" }
       ├─ divider "Row Border" (fill, 1, borderWidth 1, borderColor TOK.border)
       ├─ frame "Body Row" (fill, hug, flex row, gap 0, padding 0)
       │    ├─ frame "Cell" (width fill, hug, flex, alignItems center, padding 10/16)
       │    │    └─ text "Cell" (fontSize 14, foreground TOK.text) content: { text: "Acme Inc" }
       │    ├─ frame "Cell" (width fill, hug, flex, alignItems center, padding 10/16)
       │    │    └─ text "Cell" (fontSize 14, foreground TOK.muted) content: { text: "Active" }
       │    └─ frame "Cell" (width fill, hug, flex, alignItems center, padding 10/16)
       │         └─ text "Cell" (fontSize 14, foreground TOK.text) content: { text: "$4,200" }
       ├─ divider "Row Border" (fill, 1, borderWidth 1, borderColor TOK.border)
       └─ frame "Body Row" (same pattern, second data row)
            [cells: "Globex Corp", "Pending", "$1,800"]
```

**Design note:** 3-column table with header + 2 data rows. Uses flex row with equal-width cells (all `width: "fill"`). Header row has subtle background. This covers pricing comparisons, data dashboards, feature matrices. The AI can add/remove columns and rows.

### 4.8 `template-progress-bar` — Progress Bar

**Category:** `"Primitives"`
**ID:** `"template-progress-bar"`
**Name:** `"Progress Bar"`

**Structure:**

```
frame "Progress Bar" (outer wrapper — fill, hug, flex col, gap 8, padding 16/24, bg canvas)
  ├─ frame "Progress Header" (fill, hug, flex row, justifyContent space-between, alignItems center)
  │    ├─ text "Label" (fontSize 13, fontWeight 500, foreground TOK.text) content: { text: "Storage used" }
  │    └─ text "Value" (fontSize 13, fontWeight 500, foreground TOK.muted) content: { text: "64%" }
  └─ frame "Track" (fill, height 6, borderRadius 999, bg TOK.borderSubtle, overflow hidden)
       └─ frame "Fill" (width 192 [~64% of typical fill width], height 6, borderRadius 999, bg TOK.accent)
```

**Design note:** Track is a fixed-height frame with rounded ends. Fill is an inner frame with absolute width representing the percentage. The AI adjusts the fill width and label to match content. Both Geist (Progress, Gauge) and shadcn (Progress) have this. Essential for dashboard and product UI designs.

---

## 5. Prompt Updates (`design-tree-prompt.ts`)

### 5.1 New tokens to teach

Add to the primitive token block that's interpolated into the prompt (the section that currently defines `accent`, `border`, `text`, `muted`, etc.):

```
success: ${PRIM.success}          successSurface: ${PRIM.successSurface}
warning: ${PRIM.warning}          warningSurface: ${PRIM.warningSurface}
info: ${PRIM.info}                infoSurface: ${PRIM.infoSurface}
```

These tokens must also be added to `PRODUCT_PRIMITIVE_STYLE_TOKENS` in `design-component-library.ts`.

### 5.2 New composition recipes to add

Add these after the existing 8 SaaS recipes (Top Nav through Footer):

```
9. **Stats row** — Section frame with grid (repeat(3, 1fr) or repeat(4, 1fr), gap 24). Each cell is a **Stat Card**: Card surface with **text** label (fontSize 12, letterSpacing, uppercase, foreground ${PRIM.muted}), **text** value (fontSize 36, fontWeight 700), optional trend row (**frame** flex row with tinted circle + **text** delta in success/destructive color). Use for proof/metrics sections.

10. **FAQ accordion** — Section frame with centered heading **text** + stacked **accordion items** (4–6). Each item: **frame** with bottom border, header row (question **text** fontWeight 600 + "+" **text**), body **frame** with answer **text** (fontSize 14, foreground ${PRIM.muted}, lineHeight 1.6). Alternate: show first 2 items expanded, rest collapsed (body hidden).

11. **Data table** — Section frame with optional heading. **Table frame** (border, borderRadius 6, overflow hidden): header **frame** row (bg ${PRIM.borderSubtle}) with cell **text** (fontSize 12, fontWeight 600, letterSpacing, foreground ${PRIM.muted}), then **divider**, then body rows (fontSize 14). Cells use equal flex widths. Use for comparison tables, feature matrices, pricing breakdowns.

12. **Alert banner** — Full-width **frame** (bg ${PRIM.infoSurface}, borderColor ${PRIM.info}, borderWidth 1, borderRadius 6, padding 16). Row: icon **frame** (20×20, borderRadius 999, bg ${PRIM.info}) + column with title **text** (fontWeight 600) + message **text** (foreground ${PRIM.muted}). Swap info→warning/success/destructive per context.
```

### 5.3 Archetype-specific updates

**premium-saas / default:** Add `Stats row` and `FAQ accordion` to the typical section order: Nav → Hero → Logo strip → Features → **Stats row** → Social proof → **FAQ** → Pricing → Closing CTA → Footer.

**minimal-tech:** Add `Data table` as a valid section type for deep feature comparison. Keep FAQ optional.

**editorial-brand:** No changes — these product UI primitives should NOT appear in editorial compositions.

**creative-portfolio:** `Stats row` is valid for case study metrics. `FAQ` and `Table` are banned.

---

## 6. Files to Change


| File                                     | Changes                                                                                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/canvas/design-component-library.ts` | Add 6 new tokens to `PRODUCT_PRIMITIVE_STYLE_TOKENS`. Add 8 factory functions. Register in `DESIGN_TEMPLATES`, `TEMPLATE_FACTORIES`, and `getTemplateList()`.                                  |
| `lib/canvas/design-tree-prompt.ts`       | Add new tokens to prompt interpolation. Add 4 new composition recipes (§5.2). Update archetype section orders (§5.3). Reference new primitive names in existing recipe text where appropriate. |


**No other files change.** The template registries in component-gallery-client, quick picker, etc. already read from `DESIGN_TEMPLATES` dynamically — new entries appear automatically.

---

## 7. Implementation Order

Templates are independent — all 8 can be implemented in any order. But for sanity:

1. **First: tokens** — Add `success/successSurface/warning/warningSurface/info/infoSurface` to `PRODUCT_PRIMITIVE_STYLE_TOKENS`. Everything else depends on these.
2. **CEO priority:** `template-stat-card` + `template-alert` (§4.1, §4.2)
3. **High-leverage layout:** `template-nav-bar` (§4.3)
4. **Product UI vocabulary:** `template-avatar`, `template-tabs`, `template-accordion-item`, `template-table-row`, `template-progress-bar` (§4.4–4.8)
5. **Prompt updates:** Composition recipes + archetype section orders (§5)
6. **Registry wiring:** Add all 8 to `DESIGN_TEMPLATES`, `TEMPLATE_FACTORIES`, `getTemplateList()`

Steps 2–4 can run as parallel implementer agents (they touch disjoint code — each is a new factory function). Step 5 is a separate agent on `design-tree-prompt.ts`. Step 6 is mechanical append at the bottom of the file.

---

## 8. Proof Gates

### P1 — Template renders (per template)

Each new template inserted on canvas via Component Library gallery panel renders correctly: correct spacing, colors match tokens, text is readable, no overflow.

### P2 — AI generation uses new vocabulary

Run a premium-saas generation with a brief that calls for metrics/stats. The AI should produce stat cards, not generic text. Run another with "FAQ section" in the brief — should produce accordion items.

### P3 — Archetype boundaries hold

Run an editorial-brand generation. Verify: no stat cards, no FAQ accordions, no data tables appear. The archetype bans in §5.3 must work.

### P4 — Token consistency

Grep the new factory functions for any hardcoded hex that should use `TOK.`*. Zero allowed — all colors must reference the token object.

### P5 — TypeScript clean

`npx tsc --noEmit` — no NEW errors beyond the pre-existing ~34.

---

## 9. What This Does NOT Cover

- Interactive behavior (accordion open/close, tab switching) — static primitives only
- New DesignNode types — everything composes from the existing 5 types
- SVG icons — we approximate with colored circles/squares as icon slots
- Responsive variants of new templates
- Overlay/modal components (low priority for static pages)
- Form controls beyond existing Input Row (select, checkbox, switch — Tier 2, future tranche)

---

## 10. Reference Comparison (For Context)

### Geist components NOT in scope (and why)


| Component                   | Reason skipped                                  |
| --------------------------- | ----------------------------------------------- |
| Toast                       | Runtime notification — not static               |
| Modal / Drawer / Sheet      | Overlay — not renderable in static export       |
| Spinner / Loading Dots      | Animation — static only                         |
| Calendar / Date Picker      | Interactive widget — too complex for template   |
| Combobox / Multi Select     | Interactive widget                              |
| Context Menu / Command Menu | Interactive widget                              |
| Theme Switcher              | Meta UI — not design content                    |
| Scroller                    | Scroll container — handled by frame overflow    |
| Code Block / Snippet        | Niche — future tranche for developer portfolios |
| Browser / Phone mockup      | Specialized — could be future templates         |
| Skeleton                    | Loading state — could be useful but Tier 2      |


### shadcn components NOT in scope (and why)

Same interactive widgets plus: Resizable, Scroll Area, Hover Card, Popover, Sonner, Direction, Native Select, OTP Input, Carousel. All either interactive-dependent or too niche for the initial vocabulary expansion.