# Studio OS — Benchmark Reference Sets

**Version:** 1.0
**Created:** 2026-03-22
**Status:** Draft — references curated, benchmark not yet run
**Source boards:** Pinterest/web, Pinterest/OS, Cosmos/UX (@litterthanlit)

These are the 4 initial benchmark sets compiled from Nick's reference boards.
They are the input for `scripts/benchmark-harness.ts` and the V5 Alpha baseline measurement.

Do not run the benchmark until all reference images are confirmed stable.

---

## How to read this file

Each set has:
- A **brief** — the generation prompt given to both raw and harnessed models
- A **taste direction** — the expected aesthetic output (used to judge fidelity)
- **References** — the source images with title, source board, URL, and reason for inclusion

References marked `[board]` link to a public board — find the pin by title search within the board.
References marked `[pin]` link to a direct stable pin URL.
References marked `[live]` link to a live website.

---

## BS-01 — Editorial

**Maps to:** BM-02 in Benchmark Pack
**Difficulty:** Medium
**Why this set is useful:** Editorial is the highest-signal category for taste evaluation. A raw model defaults to blog-style templates. The harness should produce something that reads like a fashion magazine site — wrong spacing, wrong type weight, and wrong density are all immediately obvious to a reviewer.

### Brief

> Design a landing page for an editorial fashion magazine. Typography-forward, photography as the primary visual, generous whitespace, dark or warm off-white palette.

### Taste Direction

- **Typography:** Editorial serif or refined sans headings, tight tracking on display text
- **Palette:** Near-black or warm off-white background, minimal accent
- **Density:** Airy — sections breathe, not crowded
- **Layout:** Grid-based, asymmetric composition, photography fills sections
- **Mood:** refined, restrained, editorial, photography-forward
- **Avoid:** pill buttons, icon rows, card grids, feature lists, rounded corners, startup color palettes

### References

| # | Title | Source | URL | Reason |
|---|-------|--------|-----|--------|
| 1 | Maison Margiela website concept — Kateryna Didovets | Pinterest / web board | https://www.pinterest.com/litterthanli7/web/ `[board]` | Strongest luxury editorial web reference in the set. Dark palette, restrained type, fashion photography. Sets the quality ceiling. |
| 2 | Cumulus Coffee — Landing Page Design | Lapa Ninja | https://www.lapaninja.com/cumulus-coffee/ `[live]` | Warm editorial tone, photography-led hero, clean type hierarchy. Shows how editorial translates to a product/brand landing page. |
| 3 | Still Curve — fashion editorial | Pinterest / web board | https://www.pinterest.com/litterthanli7/web/ `[board]` | Model photography with minimal UI chrome. Shows the right relationship between image and text in editorial layout. |
| 4 | Weiden Haus — typographic dot field | Pinterest / web board | https://www.pinterest.com/pin/832462312416116746/ `[pin]` | Bold black/white typographic editorial, "We Make You See" headline. High contrast, no decoration. |
| 5 | Visual Narratives — photography grid | Pinterest / web board | https://www.pinterest.com/litterthanli7/web/ `[board]` | Editorial photography grid layout. Shows strong multi-image composition without defaulting to masonry. |

---

## BS-02 — Clean SaaS

**Maps to:** BM-05 in Benchmark Pack
**Difficulty:** Medium
**Why this set is useful:** Clean SaaS is the most common generation request. Raw models produce generic hero + features + pricing layouts with poor hierarchy. The harness should produce something closer to Linear or Stripe — not just correct, but crafted.

### Brief

> Design a landing page for a B2B SaaS productivity tool. Clean light background, clear value proposition above the fold, feature sections, single strong CTA.

### Taste Direction

- **Typography:** Geometric sans throughout, tight hierarchy
- **Palette:** White or light gray background, single blue or neutral accent
- **Density:** Medium — structured card-based sections, no excessive padding
- **Layout:** Grid-aligned, feature cards, UI mockup as hero element
- **Mood:** sharp, modern, credible, product-forward
- **Avoid:** gradients, illustration, decorative elements, generic startup aesthetic, dark mode hero

### References

| # | Title | Source | URL | Reason |
|---|-------|--------|-----|--------|
| 1 | monefy.ai — Finance tracker made for your business | Live site (via Cosmos/UX) | https://monefy.ai `[live]` | Dark gradient SaaS hero with strong product framing. Clear value prop, trial CTA. High-quality execution of the fintech SaaS pattern. |
| 2 | "We eliminate repetitive tasks so your team can focus on what matters" | Cosmos / UX board | https://www.cosmos.so/litterthanlit/ux `[board]` | Clean white SaaS with workflow diagram. Shows minimal, product-only aesthetic with geometric UI diagram instead of illustration. |
| 3 | "AI deserves the same security as software" | Cosmos / UX board | https://www.cosmos.so/litterthanlit/ux `[board]` | Light SaaS landing, blue accent, device mockup as hero. Clean type hierarchy, concise section structure. |
| 4 | "Automate Reordering and Supplier Decisions" | Cosmos / UX board | https://www.cosmos.so/litterthanlit/ux `[board]` | Clean workflow SaaS with two-column feature layout. Minimal chrome, structured proof sections. |
| 5 | Agency Landing Pages — 959 Marketing Examples | Lapa Ninja | https://www.lapaninja.com/agency-landing-pages/ `[live]` | Diverse collection of high-quality landing pages. Useful as a set-level reference for what good SaaS landing page diversity looks like. |

---

## BS-03 — Creative Agency

**Maps to:** BM-15 in Benchmark Pack
**Difficulty:** Medium
**Why this set is useful:** Agency sites test whether the harness can produce output with a distinct point of view. Raw models generate generic "We build digital experiences" layouts with neutral palettes. The harness should produce something with personality that still converts.

### Brief

> Design a landing page for an independent creative or branding agency. Bold headline, strong typographic hierarchy, clear point of view, services listed without looking corporate.

### Taste Direction

- **Typography:** Oversized display headline, editorial grid, strong weight contrast
- **Palette:** Black or white base with one bold accent — orange, red, or electric blue
- **Density:** High-contrast sections, deliberate negative space
- **Layout:** Editorial grid, asymmetric, full-bleed sections
- **Mood:** confident, expressive, authored, culturally-aware
- **Avoid:** startup neutrals, generic icon-feature rows, rounded card grids, anything that looks enterprise

### References

| # | Title | Source | URL | Reason |
|---|-------|--------|-----|--------|
| 1 | The Clab | Pinterest / web board | https://www.pinterest.com/litterthanli7/web/ `[board]` | Strong creative agency presence. Sets the bar for what a high-taste studio site should feel like. |
| 2 | &Co agency redesign — Jane Vi | Pinterest / web board | https://www.pinterest.com/litterthanli7/web/ `[board]` | Agency redesign case study. Shows how typographic hierarchy and personality can define a studio identity. |
| 3 | Weiden Haus — typographic | Pinterest / web board | https://www.pinterest.com/pin/832462312416116746/ `[pin]` | Black/white typographic editorial. Shows how strong type alone can carry an agency's visual identity. |
| 4 | "Stop paying AI companies to train your replacement" — orange editorial | Cosmos / UX board | https://www.cosmos.so/litterthanlit/ux `[board]` | Bold orange/black editorial layout with grid and strong headline. Shows how attitude and typographic confidence combine. |
| 5 | NOISE magazine — orange/street photography | Cosmos / UX board | https://www.cosmos.so/litterthanlit/ux `[board]` | Street photography + bold magazine typesetting. Adds cultural texture and shows how image + type can coexist with attitude. |

---

## BS-04 — Brutalist / Typographic

**Maps to:** BM-18 in Benchmark Pack
**Difficulty:** Hard
**Why this set is useful:** Brutalist is a stress test for the AVOID rules. Raw models fill empty space with illustration and gradients. The harness must understand that negative space and typographic scale ARE the design, not a problem to be solved.

### Brief

> Design a landing page where typography is the primary layout element. Extreme hierarchy, raw grid, one or two colors maximum.

### Taste Direction

- **Typography:** Heavy display typeface, oversized scale, type fills sections
- **Palette:** Black/white + one accent maximum (red, yellow, or deep blue)
- **Density:** Typography IS the layout — whitespace is intentional, not empty
- **Layout:** Grid lines implied or visible, columns used structurally, not decoratively
- **Mood:** raw, graphic, authored, poster-logic applied to web
- **Avoid:** illustration, gradients, card grids, rounded corners, soft colors, decorative icons

### References

| # | Title | Source | URL | Reason |
|---|-------|--------|-----|--------|
| 1 | Typografie Schweizer — bold red/black Swiss | Pinterest / web board | https://www.pinterest.com/litterthanli7/web/ `[board]` | Swiss typography system, red/black, grid-dominant. High-signal reference for structural typographic layout. |
| 2 | Swiss Style magazine layout | Pinterest / web board | https://www.pinterest.com/litterthanli7/web/ `[board]` | Clean Swiss grid, black/white, strong column structure. Shows how Swiss typographic discipline translates to layout. |
| 3 | The Submerged Sonata Vol.2 — Friedrichson Berlin | Pinterest / web board | https://www.pinterest.com/litterthanli7/web/ `[board]` | Berlin editorial poster, oversized date/title typography, monochrome. Pure type-as-layout. |
| 4 | Spring Order — Tokyo/Western typography collision | Cosmos / UX board | https://www.cosmos.so/litterthanlit/ux `[board]` | Black bg, blue/gold/white type collision. Multiple type systems coexisting with structure. Adds cultural texture to the set. |
| 5 | Cavix — black/gold vintage display | Pinterest / OS board | https://www.pinterest.com/litterthanli7/os/ `[board]` | Black background, bold vintage display type, grid-structured. Demonstrates how historical display type can read as brutalist when used at scale. |

---

## Coverage and gaps

### What these 4 sets cover well

- Editorial restraint (BS-01) — highest taste delta expected
- Standard SaaS generation (BS-02) — largest volume of real-world requests
- Agency personality (BS-03) — tests distinctiveness vs generic output
- Typographic brutalism (BS-04) — tests AVOID rules and negative space handling

### Known gaps

- **Luxury** is not included — only 2–3 strong luxury web references existed in the source boards. Add once more luxury brand references are collected.
- **Portfolio** is not included — overlaps too heavily with Creative Agency from available references.
- **Fintech / Data-forward** — strong cluster exists in Cosmos (monefy.ai, Airllo, D.E. Shaw, Deck Percentage) but was merged into Clean SaaS for this pass. Could be a standalone set later.
- **No e-commerce references** in source boards.
- **OS board (Pinterest)** is mostly generative art and graphic patterns — not suitable for web generation benchmarks. Use for mood/texture references only, not layout benchmarks.

### Recommended next additions

Before the full 20-board benchmark run, add:
1. A **Luxury** set (needs 3–5 dedicated luxury brand website references)
2. A **Fintech / Data SaaS** set (Airllo, D.E. Shaw, monefy.ai cluster)
3. A **Minimal Tech / Infra** set (BM-09 equivalent)

---

## Source boards

| Board | URL | Best use |
|-------|-----|----------|
| Pinterest / web | https://www.pinterest.com/litterthanli7/web/ | Web layout references, editorial, agency, brutalist |
| Pinterest / OS | https://www.pinterest.com/litterthanli7/os/ | Graphic patterns, generative art, texture — NOT layout benchmarks |
| Cosmos / UX | https://www.cosmos.so/litterthanlit/ux | SaaS, fintech, productivity tools, creative agency |
