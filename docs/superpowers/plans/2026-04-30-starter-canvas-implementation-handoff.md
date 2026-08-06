# Starter Canvas Implementation Handoff — For the Next COO

**From:** Product / onboarding direction session  
**To:** Next COO / implementer  
**Date:** 2026-04-30  
**Context:** Replace the current generic sample project + welcome flow with a branded, proof-oriented starter canvas that teaches the Studio OS loop in one spatial board.

---

## Summary

The approved direction is no longer "open a generic sample project."

The starter experience should become a **hybrid onboarding canvas** inside the real Studio OS workspace:

- **References** — raw source inputs
- **Synthesis** — generated direction board
- **Taste Engine** — extracted intelligence layer
- **Canvas** — dominant live editable output
- **Handoff** — concrete production/export proof

This is not a plain app screenshot, not a static poster board, and not a uniform card grid. The board should feel like a **real Studio OS canvas with a branded editorial point of view**.

The winning image direction is now strong enough to implement from. Stop broad visual exploration and execute this as product.

---

## What Changes

### Replace the current sample project

Current starter flow:
- welcome overlay
- generic sample project assembled from templates
- placeholder-style references
- lightweight hints

New starter flow:
- welcome overlay CTA opens a **Starter Canvas**
- starter canvas is a curated unified-canvas board with:
  - a large hero card
  - raw references strip
  - generated synthesis board
  - taste engine card cluster
  - dominant live editable desktop/mobile artboards
  - handoff/export panel
  - compact closing card

### Keep the real product surface

This must run inside the existing unified canvas, not a separate onboarding microsite or storyboard mode.

Do not invent a temporary tutorial renderer.

The user should learn Studio OS by interacting with:
- real references
- real notes/arrows/panels
- real artboards
- real selection/edit states
- real export affordances

---

## Approved Board Structure

Implement the board as one curated unified-canvas composition.

### 1. Hero card

Large left anchor.

Copy:
- `Design with references.`
- `From inspiration to shipped UI without losing your eye.`

Purpose:
- immediate product framing
- high-brand moment
- establishes tone before mechanics

### 2. Raw references strip

Upper center-left.

Label:
- `References`

Content:
- 4 curated source references for the `systems` archetype
- one visibly emphasized/starred
- references should feel like:
  - premium SaaS landing
  - typography specimen
  - component system
  - product UI module

Purpose:
- establish raw input
- make taste source concrete

### 3. Synthesis board

Placed between references and taste engine.

Label:
- `Synthesis Board` or `Direction Draft`

Content:
- generated visual distillation of the references
- more compositional and synthetic than the raw refs
- can include:
  - type fragments
  - UI fragments
  - component details
  - metrics cards
  - system diagrams
  - restrained blue/cream/black/orange blocks

Purpose:
- bridge raw inspiration to extracted logic
- make Studio OS feel interpretive, not just organizational

### 4. Taste engine cluster

Upper right.

Headline:
- `Your taste, amplified by AI.`

Sub-panels:
- `Taste Summary`
- `Palette + Type`
- `Avoid`

Content should feel extracted and specific, not generic:
- restrained enterprise SaaS
- editorial type contrast
- spacious modular sections
- high-trust blue accent
- clean, thin borders
- system-first thinking
- avoid dashboard clutter
- avoid rounded startup gimmicks

Purpose:
- this is the product’s intelligence layer
- must feel earned by the references + synthesis board

### 5. Live canvas proof

Largest object. Dominant center module.

Headline:
- `A real design tool. Not a preview pane.`

Content:
- one desktop artboard
- one mobile counterpart
- one clearly selected section
- visible active outline / edit state
- subtle refinement control
- output should feel modular and system-led, not generic polished template

Purpose:
- prove editability
- prove responsive structure
- prove Studio OS is a real workspace

### 6. Handoff panel

Lower left / lower center.

Headline:
- `Real markup. No lock-in.`

Content:
- export UI
- code/handoff affordance
- production-ready language

Purpose:
- closes the product loop
- shifts Studio OS from “interesting AI canvas” to “usable workflow”

### 7. Closing card

Small lower-right punctuation card.

Copy:
- `Taste.`
- `Canvas.`
- `Handoff.`

Purpose:
- concise branded ending
- not a co-equal hero panel

---

## Interaction Rules

Use a minimal number of embedded workflow prompts. Keep them attached to real objects.

Allowed prompts:
- `Swap a reference`
- `Refine a section`
- `Export desktop`

Do not add more tutorial labels than this.

The board should teach by spatial structure first, copy second.

---

## Scope Decisions

### In scope
- `systems` archetype starter canvas only
- real unified-canvas implementation
- curated static starter data persisted locally
- branded cards built as real canvas items / artboards / notes
- desktop + mobile live proof
- references -> synthesis -> taste -> canvas -> handoff story

### Explicitly out of scope for first ship
- separate starter canvases for `visual` and `typography`
- live synthesis-board generation from user references
- dynamic taste extraction during onboarding
- new tutorial-only UI chrome
- advanced branching onboarding paths

Reason:
ship the strongest wedge first. The `systems` archetype fits the current Studio OS product surface and generated output best.

---

## Recommended Implementation Shape

### Primary surface

Use the existing unified canvas path:
- `/canvas?project=<starter-project-id>`
- `UnifiedCanvasView`
- unified canvas state persistence

### Replace the current starter project source

Current implementation hook:
- `lib/canvas/sample-project.ts`
- `persistSampleProject()`
- `WelcomeOverlay` CTA

Recommended change:
- either replace the current sample project builder outright
- or introduce a new `starter-canvas.ts` builder and route the welcome flow to it

Preferred:
- create a new dedicated starter builder to avoid losing the older generic sample as a fallback reference during implementation

### Data to persist

Persist as a normal local project:
- project record
- unified canvas state
- references
- project canvas state

Project state should include:
- `canvas.tasteProfile`
- `canvas.designTokens`
- optional `canvas.analysis`

This allows the right rail / canvas systems to feel real, not faked.

### Object types to use

Compose the board from existing primitives where possible:
- references as `reference` items
- hero / synthesis / handoff / closing cards as either:
  - artboards with fixed content
  - or canvas-level frame/text items if lighter-weight is better
- live proof as real desktop/mobile artboards on the same `siteId`
- workflow prompts as notes or lightweight callout cards
- connector lines/arrows as `arrow` items

Prefer the simplest structure that keeps the board editable and robust.

### Visual asset strategy

Do not rely on placeholder swatches.

Need a fixed asset pack for:
- 4 raw references
- 1 synthesis board image or structured board content

These can be stored as:
- local static images in `public/`
- or assembled from deterministic starter-canvas data

Use stable local assets for v1 implementation.

---

## File Targets

Primary likely files:

- `lib/canvas/sample-project.ts` or new sibling starter-builder file
- `app/canvas-v1/components/WelcomeOverlay.tsx`
- `lib/project-store.ts` only if starter-state persistence needs extension
- `app/canvas-v1/components/UnifiedCanvasView.tsx` only if a starter-specific affordance is needed

Optional:
- a new local asset folder in `public/` for starter-canvas source images

Do not spread onboarding logic across many surfaces unless necessary.

---

## Acceptance Criteria

The implementation is correct when:

1. First-time user opens a starter canvas, not a generic sample project.
2. The first viewport clearly reads:
   - references
   - synthesis
   - taste
   - live canvas
   - handoff
3. The center live canvas is the dominant proof object.
4. The starter board feels like Studio OS, not a generic tutorial.
5. The selected section and responsive counterpart make editability obvious.
6. Export/handoff feels concrete, not conceptual.
7. The board remains editable for at least 15 minutes without interaction surprises.

---

## Proof Gates

Required:
- `npm run build`
- manual browser pass on `/canvas?project=<starter-project-id>`

Manual verification checklist:
- starter project loads with all sections populated on first open
- viewport opens at the intended composition, not zoomed incorrectly
- references are visible and selectable
- hero/synthesis/handoff cards do not break canvas interaction
- selected live section is readable and obviously active
- mobile counterpart reads as related to desktop
- arrows / notes do not interfere with common gestures
- export/handoff area is visible and legible
- board still feels coherent in light theme and warm-dark editor mode if applicable

Launch-quality check:
- a new solo designer can understand the loop and make the intended three edits:
  - swap a reference
  - refine a section
  - export/publish

This aligns with the existing 90-day launch principle:
- onboarding should start from references and lead to exactly three edits

---

## Recommended Execution Order

1. Build starter project data model and persisted board layout
2. Route welcome overlay to the new starter canvas
3. Add stable local assets for references and synthesis board
4. Tune viewport / spatial composition
5. Verify the live artboards and selection state read clearly
6. Run full manual onboarding pass

Do not start with polish tweaks before the spatial board actually loads correctly.

---

## Final Direction Lock

Do not revert to:
- generic sample project
- plain app screenshot composition
- equal-card onboarding board
- poster-only branded board with no live proof

The approved direction is:

**a branded narrative board with real proof modules inside the actual Studio OS canvas.**

That is now the canonical starter-canvas implementation target.
