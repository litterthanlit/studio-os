# Starter Canvas Implementation Spec

**Date:** 2026-05-01  
**Status:** Approved for implementation  
**Source:** `2026-04-30-starter-canvas-implementation-handoff.md` + grill-me decision pass

---

## Direction

Replace the generic sample-project onboarding path with a branded **Starter Canvas**.

The Starter Canvas is a seeded real Studio OS project. It runs inside the normal unified canvas, uses normal canvas primitives, persists through the normal local project store, and proves the actual product loop:

**References -> Synthesis -> Taste Engine -> Editable Canvas -> Handoff**

This is not a tutorial renderer, microsite, app screenshot, or fake storyboard.

---

## Locked Decisions

1. **Separate builder**
   - Create a new starter builder instead of overwriting `sample-project.ts`.
   - Keep old sample project intact as fallback/reference.

2. **Seeded real project**
   - Starter Canvas is a normal local project with normal unified canvas state.
   - No custom onboarding renderer.
   - No new canvas item kind.
   - No starter-specific canvas mode.

3. **Existing primitives only**
   - Use `reference`, `frame`, `text`, `artboard`, `note`, and `arrow`.

4. **Reference assets**
   - Use rich deterministic SVG `data:image/svg+xml` references generated inside the starter builder.
   - These should look like real cropped references, not placeholder swatches.
   - Raw references are interactive source cards: selectable, movable, resizable, annotatable, star/mute/style-ref capable.
   - Do not make raw reference pixels internally editable in v1.

5. **Editability emphasis**
   - Highest fidelity goes into the live desktop/mobile proof artboards.
   - Surrounding narrative modules are lighter but still real editable canvas/design objects.

6. **Scope**
   - Ship only the `systems` archetype.
   - Do not add `visual` or `typography` starter variants in v1.

---

## File Targets

Primary:

- `lib/canvas/starter-canvas.ts`
- `app/canvas-v1/components/WelcomeOverlay.tsx`

Likely unchanged:

- `lib/canvas/sample-project.ts`
- `lib/project-store.ts`
- `app/canvas-v1/components/UnifiedCanvasView.tsx`

Only touch unchanged files if implementation proves it necessary.

---

## Builder API

Create:

```ts
export const STARTER_CANVAS_PROJECT_ID = "starter-canvas";
export const STARTER_CANVAS_LAYOUT_VERSION = 1;

export function createStarterCanvasProject(): {
  project: StoredProject;
  canvasState: UnifiedCanvasState;
};

export function persistStarterCanvas(): string;

export function hydrateStarterCanvas(
  projectId: string,
  state: UnifiedCanvasState
): UnifiedCanvasState;
```

Use a separate localStorage layout version key:

```ts
studio-os:starter-canvas-layout-version
```

If `hydrateStarterCanvas()` is added, wire it in `canvas-context.tsx` beside `hydrateSampleProjectCanvas()`. Only do this if versioned replacement is needed after initial load.

---

## Welcome Overlay Change

Update primary CTA:

- Current: `Open sample project`
- New: `Open starter canvas`

Behavior:

- `persistStarterCanvas()`
- dismiss welcome overlay
- navigate to `/canvas?project=starter-canvas`

Secondary CTA remains start-from-scratch.

---

## Canvas State

Persist under the normal key:

```ts
studio-os:canvas-v3:starter-canvas
```

Project:

```ts
{
  id: "starter-canvas",
  name: "Starter Canvas",
  brief: "A guided Studio OS starter canvas showing the references-to-handoff workflow.",
  color: "#4B57DB"
}
```

Canvas defaults:

- `activeBreakpoint: "desktop"`
- `prompt.isOpen: false`
- selection should focus the live desktop proof:
  - `activeItemId`: desktop proof artboard ID
  - `selectedItemIds`: `[desktop proof artboard ID]`
  - `selectedNodeId`: selected section inside the desktop proof
  - `selectedNodeIds`: `[selected section ID]`

Viewport:

- Open on the full board composition.
- Live canvas proof must be visually dominant.
- First viewport should reveal references, synthesis, taste, live proof, and handoff without requiring hunting.

Recommended starting point:

```ts
viewport: { pan: { x: 90, y: 60 }, zoom: 0.32 }
```

Tune manually after visual check.

---

## Project State

Also persist project state via `upsertProjectState()`:

```ts
canvas: {
  tasteProfile,
  designTokens,
  analysis,
  siteType: "saas-landing",
  fidelityMode: "balanced"
}
```

Purpose:

- Right rail should feel real.
- Taste/design systems should not look empty.
- Export/handoff path should have normal project context.

---

## Board Layout

Use one curated spatial board.

Recommended coordinate system:

| Module | Kind | Position | Size | Priority |
|---|---|---:|---:|---|
| Hero card | `frame` | `x: 80, y: 80` | `520 x 360` | Brand framing |
| References strip | `reference[]` | `x: 660, y: 80` | `4 x 220` | Raw source proof |
| Synthesis board | `frame` | `x: 660, y: 370` | `620 x 430` | Interpretation bridge |
| Taste Engine | `frame` | `x: 1350, y: 80` | `520 x 520` | Intelligence layer |
| Desktop proof | `artboard` | `x: 520, y: 900` | `1440 x 1380` | Dominant proof |
| Mobile proof | `frame` | `x: 2050, y: 900` | `375 x 1040` | Responsive proof preview |
| Handoff panel | `frame` | `x: 80, y: 1600` | `360 x 470` | Export proof |
| Closing card | `frame` | `x: 2050, y: 2020` | `375 x 260` | Branded ending |

Use arrows sparingly:

- References -> Synthesis
- Synthesis -> Taste Engine
- Taste Engine -> Desktop proof
- Desktop proof -> Handoff

Use only three workflow prompts:

- `Swap a reference`
- `Refine a section`
- `Export desktop`

Represent prompts as `note` items attached near the relevant module.

---

## Reference Images

Create four rich SVG data references:

1. **Premium SaaS landing**
   - restrained enterprise hero
   - black/white surface
   - blue accent
   - strong product block

2. **Typography specimen**
   - large editorial type contrast
   - serif/sans pairing
   - thin rules
   - modular scale labels

3. **Component system**
   - buttons, tabs, inputs, cards, color tokens
   - clean thin borders
   - sparse, system-first

4. **Product UI module**
   - dashboard/module crop
   - high-trust metrics
   - restrained layout
   - not cluttered

One reference should be visibly starred:

```ts
weight: "primary",
isStyleRef: true
```

Extracted metadata should be specific:

- colors: `#1A1A1A`, `#FFFFFF`, `#4B57DB`, `#F5F5F0`, optional restrained warm accent
- fonts: `Geist Sans`, `Bespoke Serif`, `IBM Plex Mono`
- tags: `enterprise saas`, `editorial type`, `thin borders`, `modular systems`, etc.

---

## Narrative Module Content

### Hero

Copy:

- `Design with references.`
- `From inspiration to shipped UI without losing your eye.`

Role:

- first brand anchor
- explains the loop without tutorial clutter

### Synthesis Board

Label:

- `Synthesis Board`

Content:

- visual fragments distilled from the references
- typography blocks
- UI fragments
- metric/card fragments
- system diagram hints

Must feel interpretive, not like a screenshot dump.

### Taste Engine

Headline:

- `Your taste, amplified by AI.`

Panels:

- `Taste Summary`
- `Palette + Type`
- `Avoid`

Specific content:

- restrained enterprise SaaS
- editorial type contrast
- spacious modular sections
- high-trust blue accent
- clean thin borders
- system-first thinking
- avoid dashboard clutter
- avoid rounded startup gimmicks

### Handoff

Headline:

- `Real markup. No lock-in.`

Content:

- export/publish language
- code handoff preview
- concrete production affordance copy

### Closing

Copy:

- `Taste.`
- `Canvas.`
- `Handoff.`

Small punctuation card only.

---

## Live Proof Artboards

The desktop/mobile proof is the main product evidence.

Desktop artboard:

- breakpoint: `desktop`
- width: `1440`
- height: around `1380`
- modular SaaS/product page
- strong selected section in the middle
- real DesignNode tree
- should feel system-led, not generic template

Mobile proof:

- kind: `frame`
- width: around `375`
- height: around `1040`
- related structure, not a separate concept
- visual counterpart to the desktop proof
- use a frame, not a second same-site artboard, because the current responsive architecture migrates projects to one artboard per site

Selected section:

- Choose one clear section inside desktop proof.
- Set it as `selectedNodeId`.
- It should visibly show the active outline/edit state on first load.

Recommended selected section:

- a mid-page modular proof/system section, not the hero.

Reason:

- It proves nested editing better than selecting the whole page hero.

---

## Design Tokens

Use tokens that match Studio OS:

- accent: `#4B57DB`
- background: `#FAFAF8`
- surface: `#FFFFFF`
- muted surface: `#F5F5F0`
- border: `#E5E5E0`
- text primary: `#1A1A1A`
- text secondary: `#6B6B6B`

Typography:

- headings: Bespoke Serif only for display moments
- body/UI: Geist Sans
- data/kickers: IBM Plex Mono

Avoid:

- gradients as decoration
- heavy shadows
- pill-heavy startup UI
- generic dashboard clutter
- rounded `xl` card language

---

## Implementation Tasks

1. Add `lib/canvas/starter-canvas.ts`
   - seeded IDs
   - rich SVG reference factories
   - helper builders for DesignNode frames/text/buttons/dividers
   - starter `tasteProfile`, `designTokens`, optional `analysis`
   - `createStarterCanvasProject()`
   - `persistStarterCanvas()`

2. Wire `WelcomeOverlay`
   - import `persistStarterCanvas`
   - update CTA label
   - route to `/canvas?project=starter-canvas`

3. Optional hydrate hook
   - add `hydrateStarterCanvas()` only if needed for version upgrades
   - wire in `canvas-context.tsx` only if implemented

4. Tune board coordinates
   - first viewport should read the full loop
   - live proof must dominate
   - notes/arrows must not interfere with gestures

5. Verify selection state
   - desktop artboard active
   - one section selected
   - selection outline visible

6. Run proof gates
   - build
   - browser QA

---

## Proof Gates

Required:

```bash
npm run build
```

Manual browser pass:

```text
/canvas?project=starter-canvas
```

Checklist:

- first-time welcome primary CTA opens Starter Canvas
- old sample project code still exists
- starter project loads all modules on first open
- first viewport shows the product loop
- references are visible, selectable, movable, resizable, and star/mute capable
- synthesis/taste/handoff modules are editable canvas/design objects
- desktop proof dominates the composition
- mobile proof reads as responsive counterpart
- selected desktop section is visibly active
- three workflow prompts are present and no extra tutorial labels appear
- arrows/notes do not block ordinary canvas gestures
- export/handoff panel is visible and concrete
- board works in light and warm-dark editor themes
- no console errors during first load
- board remains editable for 15 minutes without interaction surprises

---

## Non-Goals

- No new tutorial renderer.
- No new canvas item kind.
- No live dynamic synthesis generation during onboarding.
- No separate `visual` or `typography` starter canvas.
- No editable internals for raw reference SVG images.
- No broad UI chrome changes.
- No unrelated export/publish changes.

---

## Implementation Standard

This is launch-facing onboarding. It should feel like Studio OS, not a demo fixture.

Bias toward:

- fewer, stronger objects
- real editable proof
- precise hierarchy
- quiet premium system language
- obvious references-to-handoff story

Do not ship a uniform card grid or poster board.
