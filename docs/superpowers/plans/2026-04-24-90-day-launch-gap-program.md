# 90-Day Launch Gap Program

## Product Bet

Studio OS should win the first switching wedge with solo designers by making this loop feel faster and smarter than Figma or Framer:

**References -> Taste Brief -> editable generated site -> responsive polish -> publish/share.**

This is not the full replacement plan. Collaboration, plugins, enterprise libraries, advanced prototyping, and CMS depth stay post-launch unless they directly unblock the loop above.

## Phase 1: Canvas Trust

Exit criterion: a sample project can be edited for 15 minutes without interaction surprises.

- Keep `npm run qa:canvas-trust` green before pushing canvas/editor interaction changes.
- Treat select, nested select, drag, resize, text edit, undo/redo, breakpoint switching, layer highlight sync, and inspector sync as launch blockers.
- Selection must use the same resolved component tree in canvas, layers, breadcrumb, inspector, and export scope.
- Single click selects, double-click edits, drag starts from the layer under the pointer, and resize handles always capture the gesture.

## Phase 2: Taste Engine Productization

Exit criterion: generated output visibly reflects references in structure, mood, typography, and hierarchy.

- The right rail must show a readable Taste Brief before and after generation.
- Benchmark the same references and prompts repeatedly; score taste match, visual specificity, responsiveness, and editability.
- Generation modes should ship in this priority order: Explore directions, Tighten spacing, Make more premium, Make more editorial, More like / less like reference.
- Section regeneration must preserve surrounding edits and make the changed section obvious.

## Phase 3: Launch Workflow

Exit criterion: a new solo designer can generate, edit, and publish/share in one session.

- Export and publish must show preflight warnings for missing media, external assets, breakout-heavy layouts, unsupported effects, and responsive risk.
- Publish should be the primary path; Copy HTML and ZIP remain secondary handoff tools.
- Onboarding should start from references and lead to exactly three edits: select a section, regenerate/tighten it, publish/share.

## Proof Gates

- `npm run qa:canvas-trust`
- `npx tsc --noEmit --pretty false`
- `npm run lint -- --quiet`
- `npm run build`
- Manual browser pass on `http://localhost:3001/canvas?project=sample-project`
- Benchmark pass with at least five reference sets before launch copy claims improve.

## Current Implementation Hooks

- Visible Taste Brief lives in `TasteCard`.
- Export readiness lives in `runExportPreflight`.
- Canvas/editor regression invariants live in `scripts/canvas-trust-smoke.ts`.
