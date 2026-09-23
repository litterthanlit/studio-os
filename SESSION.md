# SESSION.md — coding-agent continuity

Read this file first. Do not start from `extensions/cursor/`. That folder is the live MCP plugin for editing user canvases, not the architecture guide and not session memory.

This repo has no external project-memory service. Continuity for the next coding agent is **this file**, committed with the work.

## Last updated

2026-09-23: milestone M0 (Phase 0, tasks 0.1–0.10) implemented on branch `claude/vigilant-einstein-6zi4no`, [draft PR #23](https://github.com/litterthanlit/studio-os/pull/23). One commit per task; all Phase 0 gates pass. Not merged yet.

## Resume point

**Current program:** `docs/superpowers/plans/2026-09-23-master-plan-design-brain-atlas.md`, built on the evidence in `docs/superpowers/plans/2026-09-22-architecture-review-design-brain.md`.
- **M0 code is done on PR #23.** It is waiting on Nick's review and merge.
- **M0 exit is not done, and two items remain open:**
  1. The live half of 0.6 needs a Convex dev deployment. Set `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_INTERNAL_API_SECRET` and `CONVEX_LIMITS_PROOF_PROJECT_ID`, then run `npm run proof:convex-canvas-limits`.
     - Offline, the result is over the documented limits: a 12-level tree measures depth 27 (limit 16), and the deepest tree that fits is 6 levels.
     - If the live run confirms this, Phase 3 moves to the front (Nick decides).
  2. The §2 live demo needs a deployment plus `OPENROUTER_API_KEY`.
- **Next:** M1 (Phase 1). It needs Nick's sign-off, and every new surface in plan §1.6 needs approval.

**Platform state:**
- **Shared document.** The signed-in editor and agents still share one `canvasDocuments` row and `revision` counter. The live canvas route is `UnifiedCanvasPage` → `UnifiedCanvasView` only.
- **Agent writes.** They go through `writeCanvasWithRebase`: on `CANVAS_REVISION_CONFLICT` it reloads, re-applies the operations and retries (up to 3). A caller-pinned `expectedRevision` is not rebased. `select_on_canvas` reports `selection.persisted: false` until presence ships (3.4).
- **Design state.** Taste and tokens live in Convex `projectDesignState`, written through from the editor (`useProjectDesignState`). Every agent route resolves them in the order request > project > defaults.
- **Async runs.** MCP `generate_screen` / `generate_screen_set` are async: they return a `runId` at once and execute with `after()` into Convex `agentRuns`. Agents poll with `get_run`. Screen sets end `complete | partial | failed` and list missing screen ids.
- **Uploads.** References and image replacements upload to Convex file storage (`canvasAssets`, 2048px longest side). Existing data-URL references migrate lazily.
- **Model telemetry.** Model calls go through `tracedCompletion` into Convex `modelCalls`, batched.
- **Intent.** Classification uses a model with a word-boundary heuristic fallback (`lib/canvas/intent-classifier.ts`). Generation receives real reference ids, weights and annotations.
- **Taste corrections.** Overrides persist: palette becomes a HARD directive, and structural edits write `userOverrides.knobs`. Generated artboards carry a persisted `generationBaseline`.
- **App screens.** They get an in-app prompt frame and status colors. Nodes named `Status: <tone> · …` are exempt from palette checks.
- **Fonts.** Screenshots and document exports load the design fonts.
- **Constraints carried over.** Convex writes stay dirty-fingerprint only, with an 8s trailing debounce. Open docs PR #5 is unrelated. Do not regress `extensions/cursor/`.

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
- **Taste → gen:** `app/api/taste/extract/route.ts` → `lib/canvas/directive-compiler.ts` → `lib/canvas/design-tree-prompt.ts` → `lib/canvas/generate-design-core.ts`
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
- `convex/agentRuns.ts`
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

`npm run verify` (lint + typecheck + build) is green as of M0.

## How to update this file

End of any session that lands work or changes the resume:

1. Set **Last updated**
2. Rewrite **Resume point** in 2–5 sentences (what landed, what is next, what is blocked)
3. Keep **Invariants** unless Nick changes them
4. Add or remove **Canonical paths** when those files move
5. Run `npm run proof:session-continuity`
6. Commit `SESSION.md` with the work
