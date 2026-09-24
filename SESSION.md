# SESSION.md — coding-agent continuity

Read this file first. Do not start from `extensions/cursor/`. That folder is the live MCP plugin for editing user canvases, not the architecture guide and not session memory.

This repo has no external project-memory service. Continuity for the next coding agent is **this file**, committed with the work.

## Last updated

2026-09-24: milestones M0 (Phase 0, tasks 0.1–0.10) and M1 (Phase 1, tasks 1.1–1.10) implemented on branch `claude/vigilant-einstein-6zi4no`, [draft PR #23](https://github.com/litterthanlit/studio-os/pull/23). One commit per task; every Phase 0 and Phase 1 gate passes, plus `proof:multi-ref-fusion` and `proof:section-regen`. Not merged yet.

## Resume point

**Current program:** `docs/superpowers/plans/2026-09-23-master-plan-design-brain-atlas.md`, built on the evidence in `docs/superpowers/plans/2026-09-22-architecture-review-design-brain.md`.
- **M0 + M1 code is done on PR #23.** It is waiting on Nick's review and merge. The M1 UI surfaces (1.7 sliders, 1.8 X-ray / role chips / lasso / Intent Card / Taste Memory, 1.9 Live Build skeletons) were approved by Nick before they were built; the PR carries a manual QA checklist.
- **Open items, all needing a deployment and keys:**
  1. The live half of 0.6 (`npm run proof:convex-canvas-limits` against a Convex dev deployment). Offline, a 12-level tree measures depth 27 (limit 16). If the live run confirms this, Phase 3 moves to the front (Nick decides).
  2. The §2 M0 demo and the §1.4 M1 demo (0–10 s: X-ray, roles, Intent Card, Live Build) need a deployment plus `OPENROUTER_API_KEY`.
  3. `proof:model-routes` checks cached tokens > 0 on a second live call only when a key is present; it has not run live yet.
- **Next:** M2 (Phase 2: renderer parity, deterministic checks, calibrated judge, benchmark v2). It needs Nick's sign-off.

**Platform state:**
- **Shared document.** The signed-in editor and agents still share one `canvasDocuments` row and `revision` counter. The live canvas route is `UnifiedCanvasPage` → `UnifiedCanvasView` only.
- **One engine pipeline (1.2).** The editor, agents and the benchmark all run `lib/engine/pipeline.ts`: resolveAssets → analyzeReferences → buildBrief → compileTaste → generate → verify → persist. Steps checkpoint into Convex `generationRuns` (JSON-string checkpoints), and failed runs resume from the failed step. The editor starts runs via `POST /api/engine/runs` and follows the run row (`watchQuery`, or polling when local). Progress labels come only from real step events.
- **Design Memory (1.1).** Convex `tasteLayers` (derived / explicit / learned), `tokenSets`, versioned `designBriefs`, `referenceAnalyses` (per owner + asset hash + analyzer version), `preferences` and `assets`. The 0.4 `designState` API reads and writes these layers and migrates the legacy `projectDesignState` row.
- **Intent Engine (1.3, 1.4).** Pixels are measured (OKLab palette, projection-profile grid, type ratio from vision text boxes), and one labelled vision call perceives qualities with evidence bboxes. The brief assigns roles per reference (explicit > annotation > inferred), records conflicts and at most 3 questions, and derives directives with provenance. `briefCacheKey` invalidates derived taste. Every image in every model call is labelled "Image N · id · weight · role".
- **Layered taste compile (1.5).** `lib/taste/compile.ts` layers derived ← explicit ← learned (in scope) plus measured brief directives. HARD numeric directives come only from measured values ≥ 0.7 or explicit overrides, and the archetype is a weighted hint. Legacy profiles produce byte-identical directive text.
- **Preferences (1.6).** Variant picks, section regenerations, edits at approve / regenerate / idle boundaries, and reverts become scoped `proposed` preferences (content edits are ignored). A headless `PreferenceLearning` hook at the canvas root writes them. Accepted ones feed the learned layer.
- **Models (1.10).** Call sites use `modelFor(route)` (`MODEL_ROUTES`, env `MODEL_ROUTE_*`). The judge defaults to a different family (Gemini 2.5 Pro) from the generator (Sonnet). The design prompt is a stable cacheable prefix (schema, rules) plus a per-request suffix.
- **Live Build (1.9).** The base generation streams. `lib/engine/stream-parse.ts` emits each completed top-level section onto the run, and desktop artboards render them with flat skeletons. The final tree is validated as before.
- **UI (1.7, 1.8).** The prompt panel has Intent sliders (explicit knobs + Restyle), the Intent Card and Taste Memory. References have role chips (keys 1–7), the X-ray overlay (X toggles, Esc exits) and a region lasso.
- **Agent writes.** They go through `writeCanvasWithRebase`: on `CANVAS_REVISION_CONFLICT` it reloads, re-applies the operations and retries (up to 3). `select_on_canvas` reports `selection.persisted: false` until presence ships (3.4).
- **Async runs.** MCP `generate_screen` / `generate_screen_set` return a `runId` at once and execute with `after()`. Agents poll with `get_run`. Screen sets end `complete | partial | failed` and list missing screen ids.
- **Uploads, telemetry, fonts.** References upload to Convex file storage (2048px). Model calls go through `tracedCompletion` / `tracedStreamCompletion` into `modelCalls`. Screenshots and exports load the design fonts.
- **Constraints carried over.** Convex writes stay dirty-fingerprint only, with an 8s trailing debounce. Transient editor state (`designSignals`, `prompt.liveSections`) is never persisted. Open docs PR #5 is unrelated. Do not regress `extensions/cursor/`.

## Product

Studio OS is a **design harness**: references → taste extraction → HARD/SOFT/AVOID directives → V6 DesignNode JSON → infinite canvas. Benchmark: raw 5/10, harnessed 9/10, delta +4. Treat that as historical: it comes from a text-summary scorer graded against the same taste profile, one editorial set. Benchmark v2 in the master plan (task 2.5) replaces it. Debut is already shipped.

## Invariants

- Debut is shipped — do not reopen or rebuild it
- Do not rebuild PageNode / V5
- Do not invent canvas / digest / attn surfaces
- Do not skip proof gates that already exist
- Convex is truth; localStorage is cache only

## Where to read (in order)

1. `SESSION.md` (this file) — resume, invariants, canonical paths
2. `CLAUDE.md` — commands, DesignNode, file map, design system
3. `docs/superpowers/plans/2026-09-23-master-plan-design-brain-atlas.md` — current program: milestones, tasks, proof gates
4. `AGENTS.md` — roles (CEO / COO / Creative Director / QA) after the resume is clear
5. `extensions/cursor/` — only when installing or debugging the live MCP plugin

## Architecture

Do not re-learn this from the plugin folder.

- **V6 DesignNode** (`frame | text | image | button | divider`): `lib/canvas/design-node.ts`
- **Canvas state + reducer:** `lib/canvas/unified-canvas-state.ts`, `lib/canvas/canvas-reducer.ts`
- **Renderer:** `app/canvas-v1/components/ComposeDocumentViewV6.tsx`
- **Convex canvas:** `convex/schema.ts` (`canvasDocuments`), `convex/projects.ts` (`persistCanvasState` via `loadCanvas` / `saveCanvas` / agent saves), dirty-only writes in `lib/canvas/canvas-save-policy.ts`, shared write helpers in `lib/canvas/canvas-document.ts`, signed-in reconcile in `lib/canvas/canvas-convex-sync.ts`, agent presence in `lib/canvas/agent-presence.ts`
- **Engine:** `lib/engine/pipeline.ts`, `lib/engine/steps/*`, `lib/engine/run-store.ts`, `app/api/engine/runs/route.ts`; editor client in `lib/engine/client.ts`
- **Intent + taste:** `lib/intent/{measure,perceive,brief,conflicts,labels,reference-actions}.ts` → `lib/taste/compile.ts` (layers) → `lib/canvas/directive-compiler.ts` → `lib/canvas/design-tree-prompt.ts` (prefix + suffix) → `lib/canvas/generate-design-core.ts`
- **Design memory:** `convex/designMemory.ts`, `lib/design-memory/{types,client}.ts`; preferences in `lib/taste/preferences.ts`
- **Plugin (product MCP, not coding-agent memory):** `extensions/cursor/README.md`

## Canonical paths

Paths the next agent should open instead of rediscovering the tree from `extensions/cursor/`:

- `SESSION.md`
- `CLAUDE.md`
- `docs/superpowers/plans/2026-09-23-master-plan-design-brain-atlas.md`
- `docs/superpowers/plans/2026-09-22-architecture-review-design-brain.md`
- `AGENTS.md`
- `README.md`
- `package.json`
- `convex/schema.ts`
- `convex/projects.ts`
- `lib/canvas/design-node.ts`
- `lib/canvas/unified-canvas-state.ts`
- `lib/canvas/canvas-reducer.ts`
- `lib/canvas/canvas-context.tsx`
- `lib/canvas/canvas-convex-sync.ts`
- `lib/canvas/canvas-document.ts`
- `lib/canvas/canvas-save-policy.ts`
- `lib/canvas/canvas-content-hash.ts`
- `lib/canvas/agent-presence.ts`
- `app/canvas-v1/components/AgentCanvasPresence.tsx`
- `app/canvas-v1/components/CanvasCode.tsx`
- `lib/agent/canvas-agent-ops.ts`
- `app/api/agent/canvas/route.ts`
- `docs/VERIFY.md`
- `docs/proofs/convex-canvas-limits.json`
- `lib/agent/agent-generation.ts`
- `lib/agent/agent-runs.ts`
- `lib/agent/agent-design-state.ts`
- `lib/agent/canvas-write-rebase.ts`
- `lib/agent/mcp-tool-registry.ts`
- `convex/designState.ts`
- `convex/generationRuns.ts`
- `convex/assets.ts`
- `lib/canvas/intent-classifier.ts`
- `lib/canvas/font-links.ts`
- `lib/canvas/taste-edit-tracker.ts`
- `lib/canvas/reference-upload.ts`
- `lib/ai/model-router.ts`
- `lib/ai/model-telemetry.ts`
- `lib/canvas/directive-compiler.ts`
- `lib/canvas/design-tree-prompt.ts`
- `lib/canvas/generate-design-core.ts`
- `lib/project-store.ts`
- `convex/designMemory.ts`
- `lib/design-memory/types.ts`
- `lib/engine/pipeline.ts`
- `lib/engine/types.ts`
- `lib/engine/stream-parse.ts`
- `lib/intent/brief.ts`
- `lib/intent/perceive.ts`
- `lib/intent/reference-actions.ts`
- `lib/taste/compile.ts`
- `lib/taste/preferences.ts`
- `lib/taste/intent-sliders.ts`
- `app/canvas-v1/components/intent/ReferenceXray.tsx`
- `app/canvas-v1/components/ComposeDocumentViewV6.tsx`
- `extensions/cursor/README.md`

## Plugin vs coding agents

`extensions/cursor/` is a thin Agent/Cursor plugin: remote MCP URL + `STUDIO_OS_API_TOKEN`. Use it to list projects, read compact canvas state, and patch DesignNodes on a live Studio OS project.

Do **not** use it as:

- the codebase map
- session memory
- a substitute for `CLAUDE.md` / this file

## Proof

```bash
npm run proof:session-continuity
```

That gate fails if this file drifts (missing sections, dead canonical paths, or entry docs that no longer point here). When you touch an area, also run its `proof:*` script in `package.json`:

| Area | Proof scripts |
|---|---|
| Canvas sync, code items, agent presence | `proof:convex-canvas-sync`, `proof:canvas-save-throttle`, `proof:code-on-canvas`, `proof:agent-presence` |
| Phase 0 (M0) | `proof:render-fonts`, `proof:intent-routing`, `proof:taste-feedback`, `proof:app-ui-capability`, `proof:agent-platform`, `proof:agent-runs`, `proof:agent-write-rebase`, `proof:convex-canvas-limits`, `proof:model-telemetry` |
| Phase 1 (M1) | `proof:design-memory`, `proof:engine-pipeline`, `proof:intent-measure`, `proof:intent-engine`, `proof:taste-compile`, `proof:preferences`, `proof:model-routes`, `proof:stream-parse`, `proof:intent-sliders`, `proof:intent-ui` (plus `proof:multi-ref-fusion`, `proof:section-regen` for regression) |

`npm run verify` (lint + typecheck + build) is green as of M1.

## How to update this file

End of any session that lands work or changes the resume:

1. Set **Last updated**
2. Rewrite **Resume point** in 2–5 sentences (what landed, what is next, what is blocked)
3. Keep **Invariants** unless Nick changes them
4. Add or remove **Canonical paths** when those files move
5. Run `npm run proof:session-continuity`
6. Commit `SESSION.md` with the work
