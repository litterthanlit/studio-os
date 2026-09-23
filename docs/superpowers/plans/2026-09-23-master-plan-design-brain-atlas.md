# Studio OS — Master Implementation Plan: Design Brain → Atlas

**Date:** 2026-09-23
**Status:** Proposal. Execution-ready once Nick approves. Approve per milestone, and don't start a milestone without sign-off.
**Inputs:**
- `2026-09-22-architecture-review-design-brain.md`: findings, root causes, target architecture.
- The 2026-09-18 capability audit.

Every finding from both is assigned to a task in §12.
**Supersedes:** the Phase 0 list in §6 of the 2026-09-22 review (same numbering, extended). The July master plan (Phases 1–7) is shipped history.

---

## 0. How agents execute this plan

1. **Read first.** Read `SESSION.md`, then `CLAUDE.md`, before any task. Honor the invariants: no PageNode/V5 rebuild, existing proof gates are never skipped, Convex is truth, localStorage is cache.
2. **Tasks and gates.**
   - One task means one branch/PR, or one commit if tiny, using the commit message given.
   - Run the task's gate plus the existing `proof:*` scripts for the area you touched (§11).
   - A task is not done because the build passes.
3. **Hotspot files: sequence edits, never parallelize them:**
   - `app/api/canvas/generate-component/route.ts`
   - `lib/canvas/design-tree-prompt.ts`
   - `lib/canvas/canvas-context.tsx`
   - `lib/canvas/unified-canvas-state.ts`
   - `lib/canvas/canvas-reducer.ts`
   - `app/canvas-v1/components/ComposeDocumentViewV6.tsx`
   - `app/canvas-v1/components/PromptComposerV2.tsx`
   - `convex/schema.ts`
   - `lib/agent/mcp-tool-registry.ts`
4. **Model calls.** Mock them in proofs by default. Run live proofs only when `OPENROUTER_API_KEY` is set (existing convention).
5. **UI.** New UI follows the `CLAUDE.md` design system. New surfaces are listed in §1.6 and need approval, per the SESSION invariant against inventing surfaces.
6. **New top-level folders** (`packages/`, `examples/`) get their own `package.json` and `tsconfig.json`. Add them to the root `tsconfig.json` `exclude` and to the `eslint.config.mjs` ignores so the app's `npm run verify` stays scoped (the root `include` is `**/*.ts`).
7. **Sizing.** Sizes are relative: **S**, **M**, **L**. There are no calendar estimates until capacity and cost data exist.
8. **After each milestone:** update the `SESSION.md` resume point, update the `AGENTS.md` project state, and run `npm run proof:session-continuity`.
9. **Later phases.** Phases 4–6 are specified at task level here. Each gets a short spec in `docs/superpowers/specs/` before it starts (the repo's track-spec convention).

---

## 1. North star — what makes Studio OS *the* tool

### 1.1 The shift

Generating a screen is table stakes:
- **Framer 3.0** has Agents, Branching and External Agents.
- **MagicPath 2.0** has a multiplayer multi-agent canvas, repo sync with Claude Code/Codex/Cursor, and live-site capture.
- **Paper** has 24 bidirectional MCP tools.
- **pen.dev** keeps design files in the repo, with MCP.
- **Figma** has `use_figma`, which writes to the canvas with a team's components.
- **Claude Design** builds a design system from your codebase.
- **Cursor Design Mode** edits the running app's code.

Taste for agents is taken too. **Taste** (Taste Labs) learns a personal taste vector from swipes and ratings and exports it to Claude Code, Codex and Cursor over MCP. The **Taste Labs Brand API** extracts, searches and verifies brand systems.

What nobody owns is this: **knowing what every state of your product should look like, seeing what it actually looks like, and making the two match, whichever agent writes the code.** That needs everything in the target architecture at once: intent memory, calibrated verification, a semantic IR, an app/state model, and a code bridge. That combination is why it is hard to copy.

### 1.2 The hero: **Studio OS Atlas** — "Every screen. Every state. On taste."

1. **Capture.** Connect a repo or a preview URL. Studio OS explores the running app and puts every route × state × viewport on the canvas as **editable design**, not screenshots.
2. **Scan.** A heatmap over the whole product shows drift from your approved designs and taste, broken states, missing states, and accessibility failures.
3. **Direct.** Fix something once (a token, a component or an intent slider) and watch it ripple through every state. Missing states are designed in one click.
4. **Ship.** A scoped `DesignChange` goes to Claude Code, Cursor or Codex. Studio OS re-captures the PR preview and verifies every affected state before merge.
5. **Guard.** Every later PR, from any agent or human, gets an Atlas check.

### 1.3 Signature moments on the way (each one is a demo)

| Moment | What people see | Milestone |
|---|---|---|
| **X-ray** | References light up with measured grid, type ladder, palette proportions and pinned "key moves". Assign roles ("layout from A, type from B") and it designs what you meant | M1 |
| **Taste Memory** | "Learned from your edits: prefer text-link CTAs in editorial projects (3 edits). Accept · Reject · Change scope" | M1 |
| **Live Build** | Sections stream onto the canvas as they are generated; no fake progress timers | M1 |
| **Honest Check** | A verification strip that catches contrast, token drift and overflow, plus a published benchmark against raw frontier models | M2 |
| **Stress Test** | One click shows the screen in ~20 conditions: empty, error, loading, 1,000 rows, long German strings, RTL, dark, 200% text, 320px. Breakages are flagged and fixed, and missing states are designed | M3 |
| **Atlas** | Your real app's states on one canvas with a heatmap | M4 |
| **Verified Ship** | An agent PR with a before/after grid for every affected state, all checks green | M5 |
| **Taste Scan** | A public "Lighthouse for design": scan any URL and get a shareable craft scorecard and heatmap | M6 |

### 1.4 The 60-second launch story (the demo every phase moves toward)

- **0–10 s.** Drop three references and X-ray overlays appear. Drag "layout ← A, type ← B". The Intent Card reads: "12-col dense grid from A · 1.333 type ratio from B · B's color ignored · A is dark, B is light — which mode?"
- **10–25 s.** Live Build streams the screen in. Stress Test splits it into 18 states and auto-fixes three overflows.
- **25–45 s.** In Claude Code: "implement billing to match Studio OS". Studio OS shows the PR preview states side by side: 17/18 pass, one region pinned. The agent fixes it and the result is 18/18.
- **45–60 s.** The Atlas of the whole app: 84 states under a heatmap. Drag the density slider and it ripples. Ship → PR. *"Studio OS. Every state, on taste."*

### 1.5 Competitive position

Public information as of September 2026. "—" means not found publicly, not proven absent. Re-verify before any marketing claim.

| Capability | Framer | Paper | MagicPath | Taste / Taste Labs | pen.dev | Figma | Studio OS target |
|---|---|---|---|---|---|---|---|
| AI generation on canvas | Agents | via MCP agents | multi-agent | — | via agents | `use_figma` | M1 (pipeline + Live Build) |
| Agents read/write design | CLI | 24 MCP tools | repo sync | profile via MCP | MCP | MCP | M5 (typed, visual, long-running) |
| Personal taste learning | — | — | — | swipes/ratings | — | — | M1, learned from in-canvas actions with scope |
| Visible reference understanding | — | — | canvas as context | profile extraction | — | — | M1 X-ray + roles + conflicts |
| Design every app state | — | — | — | — | — | — | M3 Stress Test + App Model |
| Capture the real app | — | — | page capture | brand from URL | — | code → canvas | M4 route × state × viewport |
| Verify implementation vs intent | — | — | — | brand verification | — | — | M5 per state, pre-merge |
| Guard every PR | — | — | — | — | — | — | M5 Atlas check |

### 1.6 New surfaces and one design-system amendment (need approval)

**Surfaces:**
- Intent Card
- Reference X-ray
- Intent sliders
- Taste Memory panel
- Verification strip and heatmap
- Stress Test matrix
- Flow/Coverage view
- Atlas view
- Implementation diff
- the public Taste Scan page

**Amendment:** formalize the status colors already in the product, for **verification UI only**:
- amber `#F59E0B` for warnings (template fallback in `CanvasArtboard.tsx`, ExportTab preflight);
- `#EF4444` for errors (invalid drop in `LayersPanelV3.tsx`);
- emerald for pass (ExportTab).

Status colors are never decorative, and always pair with an icon and text so color never carries meaning alone. `#4B57DB` remains the only accent.

**Design notes for all new surfaces:**
- **Chrome:** Geist Sans 12–13px for UI text; IBM Plex Mono 10px uppercase kickers; Bespoke Serif only for marketing display.
- **Layout:** an 8px spacing grid, 12–16px panel padding, 40px compact list rows, and 4–6px radii.
- **Motion:** 150–200 ms opacity/transform only, respecting `prefers-reduced-motion`.
- **Interaction references:** the Linear triage list for issue lists; Vercel's deployment checks for the verification strip; Stripe's docs clarity for the `DesignChange` view.

### 1.7 What we don't compete on

- Site publishing and CMS (Framer).
- GPU shaders and image generation (Paper).
- A standalone taste-profile file format (Taste). **Interoperate** instead: import/export DTCG tokens plus the knob vector (6.5).
- Hosting coding agents (ACP).

---

## 2. Milestones

| M | Name | Exit demo (must be shown, not described) | Phases |
|---|---|---|---|
| **M0** | Trustworthy | MCP `generate_screen` runs *with* project taste and returns in under 5 s (async run); screenshots render real fonts; "An approachable landing page for a bakery" stays a landing page | 0 |
| **M1** | It understood me | X-ray + roles + Intent Card + sliders + Taste Memory + Live Build; editor, agents and benchmark share one pipeline | 1 |
| **M2** | It checks itself honestly | Renderer parity, deterministic checks, calibrated pairwise judge; benchmark v2 across ≥ 6 categories against today's raw frontier baseline | 2 |
| **M3** | Every state | Stress Test + App Model + icons/tokens/roles/components + semantic export; screen sets either complete or report what's missing | 3, 4 |
| **M4** | Atlas | The demo app (`examples/atlas-demo`) captured route × state × viewport on the canvas with a Scan heatmap | 5a |
| **M5** | Verified ship | `DesignChange` → agent PR → per-state verification → Guard check on the next PR | 5b |
| **M6** | Everyone scans | Public Taste Scan, React Native proof, personal reranker | 6 |

---

## 3. Dependency graph and lanes

```
Phase 0 (trust) ─┬─► Phase 1 (understanding) ───────────────────────┐
                 ├─► Phase 2 (verification & evals) ────────────────┼─► Phase 5a (Atlas capture/scan) ─► Phase 5b (ship/guard) ─► Phase 6
                 └─► Phase 3 (storage & sync) ─► Phase 4 (IR v7 + App Model + Stress Test) ─┘

Quick wins that may start right after Phase 0: 4.1 icons, 4.4 layout additions, 1.7 intent sliders.
If 0.6 confirms the Convex limits are hit in practice, Phase 3 moves to the front.
```

**Lanes** (separate agents may run them in parallel once Phase 0 lands):
- **U** runs Phase 1.
- **V** runs Phase 2.
- **S** runs Phase 3.

Coordinate hotspot edits using rule 3 in §0.

**Phase 0 lanes:**

| Lane | Tasks (in order) | Why this order |
|---|---|---|
| P0-A | 0.1 fonts | Isolated to render/export files |
| P0-B | 0.2 intent → 0.3 taste → 0.8 app prompt frame | All three touch `PromptComposerV2.tsx` / prompt files (hotspots) |
| P0-C | 0.4 design state → 0.10 async runs → 0.5 agent writes | All touch `convex/schema.ts`, agent routes and the MCP registry |
| P0-D | 0.6 persistence proof + uploads | Upload components, plus Convex file-storage functions |
| P0-E | 0.7 hygiene (any time), 0.9 telemetry (after P0-A and P0-B merge) | 0.9 edits the generation call sites that P0-A/B touch |

---

## 4. Phase 0 — Trust and unblock (M0)

### 0.1 Load real fonts in render and export — S
- **Files:**
  - `lib/canvas/design-node-screenshot.ts`: line 21 requests `family=Geist+Sans`, which returns HTTP 400; the family is `Geist`.
  - `lib/canvas/design-node-to-html.ts`
  - new `lib/canvas/font-links.ts`
  - `lib/fonts/load-font.ts` (reuse its Google/Fontshare logic)
  - `lib/canvas/visual-refine-loop.ts`
  - `lib/canvas/build-export-zip.ts`
  - `app/published/[id]/route.ts`
  - `scripts/render-fonts-proof.ts`
  - `package.json`
- **Do:**
  - Collect `fontFamily` values from the tree, including `responsiveOverrides`.
  - Emit Google or Fontshare links in the screenshot wrapper and in document-mode HTML (ZIP and publish included).
  - Await `document.fonts.ready`.
  - Thread the artboard width (1440 desktop / 375 mobile) into screenshot callers.
- **Gate:** `proof:render-fonts`
  - a serif display font passes `document.fonts.check` inside the screenshot page (skip cleanly without Chromium);
  - exported HTML contains the font link.
- **Commit:** `fix(render): load design fonts in screenshots and exports`

### 0.2 Replace substring intent classification — S
- **Files:**
  - `types/intent-profile.ts` (`has()` at line 63)
  - new `lib/canvas/intent-classifier.ts`
  - `lib/canvas/generate-design-core.ts:319`
  - `lib/canvas/generate-screen-set-core.ts:193`
  - `app/canvas-v1/components/PromptComposerV2.tsx` (mode routing)
  - `scripts/intent-routing-proof.ts`
- **Do:**
  - Match on word boundaries and phrases.
  - Add mobile-app signals (iOS, Android, iPhone, "mobile app", app nouns + screen/flow/onboarding/checkout).
  - Add an async model classifier that returns `outputType`, `businessGoal`, confidence and alternatives, falling back to heuristics.
  - Pass real reference `{ id, weight, annotation }` values instead of `annotation: url`.
- **Gate:** `proof:intent-routing`. The six prompts from review §2.5 classify correctly, plus two landing-page controls.
- **Commit:** `fix(intent): word-boundary and model intent classification; real reference roles`

### 0.3 Taste signature, image identity, and corrections that persist — M
- **Files:**
  - `app/api/taste/extract/route.ts` (`buildSignature` at line 260; images at line 806)
  - `app/canvas-v1/components/PromptComposerV2.tsx` (`applyTasteOverrides` palette branch at line 485; `handleRefreshTaste` at line 511)
  - `types/taste-profile.ts`
  - `lib/canvas/design-knobs.ts`
  - `lib/canvas/directive-compiler.ts`
  - `lib/canvas/taste-edit-tracker.ts`
  - `lib/canvas/unified-canvas-state.ts`
  - `scripts/taste-feedback-proof.ts`
- **Do:**
  - **Signature.** Hash `{contextVersion, prompt, references[{url, weight, role}] in given order, existingTokens, compositionData}`, without sorting.
  - **Images.** Attach up to `API_LIMITS.maxReferenceUrls`. Primary and role-bearing references go at `detail: "high"`, the rest at `"low"`. Prefix each image with a label, e.g. `Image 3 · ref-abc · primary · role: typography`, and make the "Analyze these N" count match what is actually attached.
  - **Refresh.** Merge `userOverrides` into the refreshed profile; never drop them.
  - **Palette.** The empty palette branch writes `userOverrides.palette`.
  - **Structural edits.** Write `userOverrides.knobs` (a new `DeepPartial<DesignKnobVector>`) from `suggestedOverride`.
  - **Directives.** A palette override becomes a HARD directive with source `user-override`.
  - **Baseline.** Replace the session-only `generatedTreeSnapshot` dependency with a compact persisted `generationBaseline` on generated artboards (fonts, palette, average section padding, `computeDesignNodeTasteMetrics`). `detectTasteEdits` compares metric to metric.
- **Gate:** `proof:taste-feedback`
  1. The signature changes with prompt or weights and is stable otherwise.
  2. Refresh keeps overrides.
  3. A palette edit produces a HARD palette directive.
  4. A structural edit changes the serialized knobs.
  5. The baseline survives `stripCanvasForPersistence` and a reload.
- **Commit:** `fix(taste): signature covers intent inputs; corrections persist and survive refresh`

### 0.4 Server-side design state so agents get taste — M
- **Files:**
  - `convex/schema.ts` (`projectDesignState`)
  - new `convex/designState.ts` (owner, `…ForAgent` and `…ForUserAgent` variants, mirroring `convex/projects.ts`)
  - `lib/agent/convex-agent-client.ts`
  - every `app/api/agent/*/route.ts`
  - `lib/agent/mcp-tool-registry.ts`
  - editor write-through where `setTasteProfile` / token setters run
- **Do:**
  - Write taste and tokens server-side when the user is signed in; localStorage stays as cache.
  - Agent routes load them when the caller doesn't pass them.
  - `get_canvas` returns them.
- **Gate:** `proof:agent-platform` extended. The agent generate path receives the stored taste, and `visualRefineAttempted: true` when references exist (mocked core).
- **Commit:** `feat(agent): project taste and tokens are server-side and reach every agent route`

### 0.5 Agent writes survive human edits — S
- **Files:**
  - `app/api/agent/generate-screen/route.ts` (line 116)
  - `app/api/agent/generate-screen-set/route.ts`
  - `app/api/agent/canvas/route.ts`
  - `lib/agent/convex-agent-client.ts`
  - `lib/canvas/canvas-content-hash.ts` (line 28)
  - `lib/agent/canvas-agent-ops.ts`
- **Do:**
  - On `CANVAS_REVISION_CONFLICT`, reload, re-apply the operations and retry up to 3 times (`add_artboard` commutes).
  - Make `select_on_canvas` report `persisted: false` with an explanation until presence lands in 3.4.
- **Gate:**
  - a proof injects a designer save between load and save, and the artboard still lands;
  - the selection outcome is proven through the hash/persist path.
- **Commit:** `fix(agent): rebase agent writes on revision conflict; honest selection result`

### 0.6 Prove the persistence ceiling; move uploads to file storage — M
- **Files:**
  - `convex/schema.ts:97` (`state: v.any()`)
  - `convex/projects.ts`
  - `app/canvas-v1/components/UnifiedCanvasView.tsx:70` (`fileToDataUrl`)
  - `components/modals/import-reference-modal.tsx`
  - `app/canvas-v1/components/CanvasArtboard.tsx`
  - new `convex/assets.ts`
  - `scripts/convex-canvas-limits-proof.ts`
- **Do:**
  1. Run a proof against a dev deployment. Save (a) a tree at least 12 DesignNode levels deep and (b) a ~1.5 MB data-URL reference, and record the exact outcome.
  2. Upload through `generateUploadUrl`, and store the URL, storage id and content hash on `ReferenceItem`. Downscale to a 2048px longest side before upload, with a lazy migration for existing data URLs.
- **Gate:** the proof output is committed, and new uploads no longer grow the canvas document. **If (a) fails, Phase 3 moves to the front.**
- **Commit:** `fix(storage): references in file storage; prove canvas document limits`

### 0.7 Hygiene — S
- **Do:**
  - Fix the lint error at `app/canvas-v1/components/inspector/CodeItemInspector.tsx:22` (move the ref write into an effect).
  - Make `proof:visual-loop-v2` pass without a key.
  - Sync the design-system section of `.claude/skills/studio-os-dev/SKILL.md` with `CLAUDE.md`. The skill still says `#1E5DF2` and blurred panels; `CLAUDE.md` says `#4B57DB` and solid panels.
  - Replace the hard-coded model names in the README with "configured via model routes".
- **Gate:** `npm run verify` is green.
- **Commit:** `chore: lint, keyless visual-loop proof, sync dev skill with CLAUDE.md`

### 0.8 An in-app prompt frame and status colors for app screens — S
- **Files:**
  - `lib/canvas/design-tree-prompt.ts` (line 591 "composing a landing page"; line 801 "Choose 4-7 sections")
  - `lib/canvas/directive-compiler.ts`
  - `lib/canvas/design-node-taste-validator.ts`
  - `scripts/app-ui-capability-proof.ts`
- **Do:**
  - Add `buildFrameForArchetype()`. App archetypes get "senior product designer composing an in-app screen", with no section-count, hero or pacing rules. They get validator-supported grid tracks for tables and empty/loading/error patterns.
  - For app outputs, add a SOFT directive that allows status colors (success/warning/danger/info) harmonized to the palette's temperature. The validator exempts status-tagged nodes from palette violations.
- **Gate:** `proof:app-ui-capability` extended. The app prompt contains neither "landing page" nor "4-7 sections", and status colors pass on status nodes.
- **Commit:** `fix(generation): app screens get an in-app prompt frame and status colors`

### 0.9 Model-call telemetry — S
- **Files:**
  - `lib/ai/model-router.ts` (`tracedCompletion(step, params)`)
  - call sites in `generate-design-core.ts`, `generate-screen-set-core.ts`, `visual-refine-loop.ts`, `design-taste-evaluator.ts`, and the taste routes
  - a new Convex `modelCalls` table
- **Do:** record step, model, input/output/cached tokens from `usage`, latency, finish reason, cost estimate (price table in config), and runId. Write in batches.
- **Gate:** `proof:model-telemetry` (mocked usage) writes the expected records.
- **Commit:** `feat(ai): per-call token, latency and cost telemetry`

### 0.10 Async agent runs, lifting the 60 s MCP cap — M
- **Files:**
  - new Convex `agentRuns` table (absorbed into `generationRuns` in 1.1)
  - `app/api/agent/generate-screen/route.ts`
  - `app/api/agent/generate-screen-set/route.ts`
  - new `app/api/agent/runs/[id]/route.ts`
  - `lib/agent/mcp-tool-registry.ts` (new `get_run`)
  - `extensions/cursor/skills/studio-canvas/SKILL.md`
- **Do:**
  - Authorize, insert the run, and return `{ runId, status: "queued" }` right away.
  - Execute with `after()` from `next/server` under the route's `maxDuration`, writing progress rows per step.
  - Screen sets report `complete | partial | failed` with missing screen ids.
  - MCP tools return a runId; `get_run` polls.
- **Gate:** `proof:agent-runs`
  - the MCP call returns in under 5 s;
  - a mocked 4-screen set completes by polling;
  - an injected failure yields `failed` with a message;
  - a partial run lists the missing ids.
- **Commit:** `feat(agent): async generation runs with polling; lifts the 60s MCP cap`

**M0 exit:** run all Phase 0 gates plus `proof:agent-platform`, `proof:convex-canvas-sync`, `proof:canvas-save-throttle`, `proof:code-on-canvas`, `proof:agent-presence` and `security:regression`, then do the live demo from §2.

---

## 5. Phase 1 — Understanding (M1: "It understood me")

### 1.1 Design Memory — M
- **Files:**
  - `convex/schema.ts`
  - new `convex/designMemory.ts`
  - new `convex/generationRuns.ts`
  - new `lib/design-memory/{types,client}.ts`
- **Do:**
  - Add the tables from Appendix B: `assets`, `referenceAnalyses`, `designBriefs`, `tasteLayers`, `preferences`, `tokenSets`, and `generationRuns` (absorbing `agentRuns`). Keep `modelCalls` from 0.9.
  - Owner-scoped functions plus `…ForAgent` and `…ForUserAgent` variants.
  - Migrate `projectDesignState` (0.4) into `tasteLayers` (derived + explicit) and `tokenSets`.
- **Gate:** `proof:design-memory`. Owner isolation holds, agent paths work, and migration is idempotent.
- **Commit:** `feat(memory): design memory tables and access paths`

### 1.2 One engine pipeline for the editor, agents and benchmarks — L
- **Files:**
  - new `lib/engine/pipeline.ts`
  - new `lib/engine/steps/{resolveAssets,analyzeReferences,buildBrief,compileTaste,generate,verify,persist}.ts`
  - new `lib/engine/run-store.ts`
  - new `app/api/engine/runs/route.ts` and `app/api/engine/runs/[id]/route.ts`
  - `PromptComposerV2.tsx` (becomes a thin client)
  - agent routes
  - `scripts/benchmark-harness.ts`
- **Do:**
  - Steps are idempotent and checkpoint into `generationRuns`. Execution uses `after()`, and runs resume from the last checkpoint.
  - The editor creates a run, subscribes to its Convex row for real progress events, and applies outputs (`REPLACE_SITE`) as it does today.
  - Reference analysis moves server-side, cached per `assetHash + analyzerVersion`.
  - Delete the timer-driven `agentSteps` split (`PromptComposerV2.tsx:881`).
- **Gate:** `proof:engine-pipeline`
  - the editor and agent entrypoints produce identical brief and taste inputs for the same project;
  - a run resumes after an injected failure;
  - progress comes only from real events.
- **Commit:** `feat(engine): server-side design pipeline shared by editor, agents and benchmarks`

### 1.3 Intent Engine: measure — M
- **Files:** new `lib/intent/measure/{palette,grid,type}.ts`; add `sharp` as a direct dependency (today it is only transitive).
- **Do:**
  - **Palette:** k-means in OKLab on downsampled pixels, with area % and role guesses.
  - **Grid:** projection profiles on UI screenshots give column count, gutter and margins.
  - **Type:** the vision model returns text boxes with pixel heights under a strict schema, which are clustered into a ratio; inconsistent results are rejected.
- **Gate:** `proof:intent-measure`. Synthetic images with a known palette, ratio and columns measure within tolerance (ΔE < 5, ratio ±0.05, exact column count).
- **Commit:** `feat(intent): measured palette, grid and type scale from reference pixels`

### 1.4 Intent Engine: perceive, assign, clarify, brief — L
- **Files:**
  - new `lib/intent/{perceive,brief,conflicts}.ts`
  - `app/api/taste/analyze-composition/route.ts` (derived legacy view)
  - `types/composition-analysis.ts` (add app-UI vocabulary)
- **Do:**
  - **Perceive:** open-vocabulary qualities with evidence bounding boxes. App-UI vocabulary (navigation model: sidebar, tab bar, toolbar, command palette; density; data display; controls; iconography) sits alongside editorial vocabulary.
  - **Brief:** goal and output type (from 0.2), per-reference roles (explicit > annotation > inferred), region roles, constraints, conflicts, and at most 3 questions.
  - Label every image in every model call with its id, weight and role.
- **Gate:** `proof:intent-engine`
  - opposite roles produce different directives;
  - a muted reference has zero influence;
  - a brief edit invalidates the derived cache;
  - dark plus light primaries trigger a mode question.
- **Commit:** `feat(intent): design briefs with per-reference roles, evidence and conflict questions`

### 1.5 Layered taste compile — M
- **Files:**
  - new `lib/taste/compile.ts`
  - `lib/canvas/composition-blueprint.ts` (`mapTypeScale` at line 180 becomes a labeled SOFT fallback)
  - `lib/canvas/directive-compiler.ts`
  - `lib/canvas/design-knobs.ts`
- **Do:**
  - Merge derived ← explicit ← learned (in scope) into the legacy TasteProfile, the DesignKnobVector and tokens.
  - Emit HARD numeric directives only from measured values above a confidence threshold.
  - The archetype becomes a hint, not the ontology.
- **Gate:** `proof:taste-compile`. Every directive carries provenance, and legacy profiles produce unchanged prompt text.
- **Commit:** `feat(taste): layered taste compile with provenance`

### 1.6 Preferences learned from design actions — M
- **Files:**
  - `lib/canvas/taste-edit-tracker.ts`
  - `lib/canvas/structural-edit-tracker.ts`
  - `canvas-reducer.ts` event hooks (`PICK_VARIANT`, section regeneration)
  - new `lib/taste/preferences.ts`
- **Do:**
  - **Signals:** variant picks, "similar" and "different" regenerations, edits at approve/regenerate/idle boundaries (debounced), and reverts.
  - Separate content edits from taste edits.
  - Infer scope (node / screen / project / user).
  - Write `preferences` rows as `proposed`; accepted ones feed the learned layer.
- **Gate:** `proof:preferences`
  - palette and structural edits create scoped proposals;
  - accepting one changes the next compile only for in-scope screens;
  - rejecting one is a no-op;
  - copy edits are ignored.
- **Commit:** `feat(taste): learn scoped preferences from design actions`

### 1.7 Intent sliders (quick win) — S
- **Files:** `app/canvas-v1/components/FloatingPromptPanel.tsx` / `PromptComposerV2.tsx`, and a new `app/canvas-v1/components/intent/IntentSliders.tsx`.
- **Do:**
  - Add 6–8 sliders over `DesignKnobVector`: density, whitespace drama, asymmetry, scale contrast, accent restraint, chrome (radius + shadow + border), imagery dominance, and information density for app outputs.
  - Values go to the explicit layer.
  - "Restyle" regenerates with the knob delta, using section-level prompts where possible.
- **Gate:** a slider value persists to the explicit layer and changes the serialized knobs in the prompt.
- **Commit:** `feat(intent): expose design knobs as intent sliders`

### 1.8 X-ray, role chips, Intent Card, Taste Memory panel — L
- **Files:**
  - new `app/canvas-v1/components/intent/{ReferenceXray,RoleChips,RegionLasso,IntentCard,TasteMemoryPanel}.tsx`
  - `app/canvas-v1/components/ReferenceRail.tsx`
  - `app/canvas-v1/components/CanvasReference.tsx`
  - `app/canvas-v1/components/TasteCard.tsx`
- **Design:**
  - **X-ray overlay:** 1px `#4B57DB` lines at 60% for the grid, a spacing ruler, a type ladder, a palette bar with percentages, and key-move pins. Labels are 10px IBM Plex Mono. No blur.
  - **Intent Card:** a compact list (40px rows) with a mono-kicker header "UNDERSTOOD", with one question at most.
  - **Taste Memory:** each preference as a sentence, with scope and an evidence count, plus accept / reject / scope actions.
- **Accessibility:**
  - `X` toggles X-ray, `1`–`7` assign roles, `Esc` exits.
  - Role chips are toggle buttons with `aria-pressed`.
  - Overlay facts are also listed as text.
  - Focus rings use `#D1E4FC`.
- **Gate:** a manual QA checklist in the PR, plus a unit proof that chip and lasso actions update the brief.
- **Commit:** `feat(intent): reference X-ray, role chips, intent card and taste memory`

### 1.9 Live Build streaming — M
- **Files:** new `lib/engine/stream-parse.ts`; the pipeline's generate step; `CanvasArtboard.tsx` (pending-section skeletons).
- **Do:**
  - Stream the base generation.
  - An incremental JSON parser emits each completed top-level section.
  - The run row carries partial outputs, and the canvas renders sections as they land.
  - The final tree is validated as today.
- **Gate:** `proof:stream-parse`
  - a chunked fixture emits sections in order;
  - the final tree equals the non-streamed parse;
  - truncation recovery works.
- **Commit:** `feat(engine): stream sections onto the canvas as they generate`

### 1.10 Cacheable prompts and per-step model routes — M
- **Files:** `lib/ai/model-router.ts` (`MODEL_ROUTES`: perceive / classify / generate / variant / judge, with env overrides); `lib/canvas/design-tree-prompt.ts` (static prefix plus dynamic suffix).
- **Do:**
  - Put schema, grammar and few-shot in a stable, cacheable prefix, and send cache hints where the provider supports them.
  - Retire hard-coded model constants at call sites.
  - Default the judge to a different model family from the generator.
- **Gate:** `proof:model-routes`. Routes resolve, the prefix hash is stable, and when a key is present, cached tokens are > 0 on the second call.
- **Commit:** `perf(ai): cacheable prompt prefix and per-step model routing`

**M1 exit:** the §1.4 segment from 0 to 10 s, live, plus all Phase 1 gates. Also run `proof:multi-ref-fusion` and `proof:section-regen` for regression.

---

## 6. Phase 2 — Verification and evaluation (M2: "It checks itself honestly")

### 2.1 Deterministic renderer — M
- **Files:** new `lib/render/render.ts`, which grows out of `design-node-screenshot.ts`.
- **Do:**
  - Output a PNG, per-node boxes (`data-node-id` → bbox) and DOM metrics.
  - Load fonts via 0.1, use a viewport per breakpoint and state, disable animation, and fix locale and timezone.
  - Cache results by `(treeHash, viewport)`.
  - Keep `STUDIO_OS_DISABLE_SCREENSHOT`.
- **Gate:** `proof:render-parity`. On 3 fixtures, the renderer output is within a pixel-diff threshold of canvas-equivalent HTML, and boxes are returned.
- **Commit:** `feat(render): deterministic renderer with node boxes`

### 2.2 Deterministic checks with auto-fixes — M
- **Files:** new `lib/verify/checks/{contrast,tokens,spacing,overflow,touch,alignment,headings,alt,consistency}.ts` and `lib/verify/types.ts` (`ScanIssue`).
- **Do:**
  - WCAG 2.2 AA contrast.
  - Token adherence.
  - Spacing-scale adherence.
  - Overflow and truncation.
  - Touch targets (≥ 44px on mobile).
  - Grid alignment.
  - Heading order.
  - Alt text.
  - Consistency across instances of the same component.
  - Auto-fixers for contrast (nudged within the palette), token snapping and spacing snapping.
- **Gate:** `proof:verify-checks`. Seeded fixtures produce exact issue sets, and the fixers resolve them without introducing new issues.
- **Commit:** `feat(verify): deterministic design checks with auto-fixes`

### 2.3 Independent pairwise judge — M
- **Files:** new `lib/verify/judge.ts`.
- **Do:**
  - `compare(A, B, context)` scores on a rubric: reference intent, craft, hierarchy and originality.
  - Swap positions, take 2 samples, and use high-detail images.
  - Return the winner, confidence, rationale and region issues.
  - The judge family must differ from the generator family.
- **Gate:** `proof:judge-contract` (mocked). Swap consistency holds, the family guard works, and the output matches the schema.
- **Commit:** `feat(verify): independent pairwise judge`

### 2.4 Calibration against human judgment — M
- **Files:** new `app/(dashboard)/admin/evals/page.tsx` (next to the existing admin inspiration page), an `evalLabels` table, and `scripts/judge-agreement.ts`.
- **Do:** label pairs as A / B / tie with a reason, and compute judge–human agreement.
- **Gate:** the agreement report runs, and the threshold is agreed with the CEO and recorded in `docs/VERIFY.md`.
- **Commit:** `feat(evals): human labeling and judge calibration`

### 2.5 Benchmark v2 — L
- **Files:** `benchmark-sets.json`, `scripts/benchmark-harness.ts --v2`, `benchmark-results/v2-*`.
- **Do:**
  - Cover ≥ 6 categories: editorial, SaaS marketing, dense dashboard, CRUD/forms, commerce/checkout, mobile app and desktop app. Add conflicting references and adverse states.
  - Compare raw output (a current frontier model with no harness) against harnessed output through the engine API, rendering with 2.1 and judging with 2.3.
  - Report bootstrap confidence intervals.
  - Remove `scoreDesignRealtimeFidelity` from the benchmark path; it stays only as a realtime hint.
- **Gate:** the offline dry-run passes, a live report is committed, and the `AGENTS.md` benchmark lesson is updated with the new numbers, whatever they are.
- **Commit:** `feat(benchmark): v2 pairwise suite across categories`

### 2.6 Visual loop v3 — M
- **Files:** `lib/canvas/visual-refine-loop.ts`.
- **Do:** run check auto-fixes, then judge against reference intent, then repair at region level (regenerate only flagged sections via `buildDesignTreeSectionPrompt`). Stop on pass, regression or cap, and keep the best tree.
- **Gate:** `proof:visual-loop-v3` (mocked). Only flagged sections change.
- **Commit:** `feat(visual-loop): region repair on the verification stack`

### 2.7 Verification strip and heatmap — M
- **Files:** new `app/canvas-v1/components/verify/{VerificationStrip,IssueHeatmap}.tsx`, `CanvasArtboard.tsx`.
- **Do:**
  - The strip shows check counts, a Scan button and one-click fixes.
  - The heatmap shows issue density per node, using the §1.6 status palette plus icons and text.
  - Fixes dispatch `PUSH_HISTORY` before mutating.
- **Gate:** a manual QA checklist, plus a unit proof of history ordering.
- **Commit:** `feat(verify): verification strip and issue heatmap`

### 2.8 Implementation review against the approved artboard (audit #5) — M
- **Files:** `app/api/agent/review-implementation/route.ts`, new `lib/verify/impl-review.ts`.
- **Do:**
  - Render the approved artboard at the implementation's viewport.
  - Combine a pixel/structural diff (node-box matching) with the judge for intent and the checks.
  - Flag stale reviews by artboard content hash until 3.6 adds revisions.
- **Gate:** `proof:impl-review`. Right colors with a missing approved control fails, and a stale hash is flagged.
- **Commit:** `feat(agent): review implementation against approved artboard pixels`

**M2 exit:** publish the benchmark v2 report, and show the verification strip live on a generated screen.

---

## 7. Phase 3 — Storage and sync (enables M3–M5)

### 3.1 Flat node maps and rebase-safe operations — M
- **Files:** new `lib/sync/node-map.ts` (tree ↔ flat, fractional indices) and `lib/sync/ops.ts`; add a `fractional-indexing` dependency.
- **Do:**
  - **Ops:** `setProp`, `unsetProp`, `insertNode`, `moveNode`, `deleteNode`, `setItemProp`, `addItem`, `removeItem`.
  - Every op has an inverse, and applying ops is tolerant of missing targets.
- **Gate:** `proof:ops-merge`
  - concurrent edits to different nodes merge;
  - the same property resolves last-writer-wins in server order;
  - deletes are tolerant;
  - inverses restore state.
- **Commit:** `feat(sync): flat node maps and rebase-safe operations`

### 3.2 Normalized Convex storage — L
- **Files:** `convex/schema.ts` (`canvasItems`, `artboardDocs`, `canvasOps`, `designRevisions`), new `convex/canvasSync.ts`.
- **Do:**
  - An `applyOps` mutation validates, applies and bumps revision, with owner and agent variants.
  - Queries serve items plus one node map per artboard. Nesting depth stays constant however deep the tree is.
  - Behind the `STUDIO_OS_SYNC_V2` flag, dual-write from the legacy path during migration.
- **Gate:**
  - `proof:deep-tree-persist`: at least 12 levels and 500+ nodes on a dev deployment;
  - `proof:migration-v2`: blob → normalized → blob round-trips to equality.
- **Commit:** `feat(sync): normalized canvas storage behind SYNC_V2`

### 3.3 Client sync engine — L
- **Files:** `lib/canvas/canvas-context.tsx`, new `lib/sync/client.ts`.
- **Do:**
  - Queue optimistic ops and send them in ~250 ms batches.
  - Rebase pending ops when server state arrives.
  - Undo only the user's own inverse ops, so it survives remote writes.
  - Under the flag, retire the 8-second whole-document debounce.
- **Gate:** `proof:undo-own-ops`, plus two-tab and agent-concurrency manual QA.
- **Commit:** `feat(sync): optimistic ops with own-op undo`

### 3.4 Presence — S
- **Files:** a `presence` table with TTL heartbeats; `app/canvas-v1/components/AgentCanvasPresence.tsx`.
- **Do:** `select_on_canvas` writes presence, and the editor shows agent selections.
- **Gate:** `proof:presence`.
- **Commit:** `feat(presence): ephemeral presence; agent selection visible`

### 3.5 Agent writes as operations — M
- **Files:** agent routes and pipeline outputs.
- **Do:** agent writes and generation outputs are emitted as ops, not whole-document saves.
- **Gate:** re-run the 0.5 proof under `SYNC_V2`.
- **Commit:** `refactor(agent): agent writes as operations`

### 3.6 Approved design revisions — S
- **Do:**
  - An "Approve" action creates an immutable `designRevisions` row: tree, tokens, fixture, viewport and render hash.
  - Implementation review compares against the revision and flags stale ones.
- **Gate:** `proof:revisions`.
- **Commit:** `feat(revisions): approved design revisions`

---

## 8. Phase 4 — Semantic IR, App Model, Stress Test (M3: "Every state")

A spec goes in `docs/superpowers/specs/` before this phase starts. The type sketches are in review §4.7–4.8.

| Task | Size | Scope | Gate | Commit |
|---|---|---|---|---|
| **4.1 Icons** (quick win) | M | `icon: { set: "lucide", name }`, plus the legacy `content.icon: "lucide:name"`. Rendered in `ComposeDocumentViewV6.tsx` (node switch lines 726–941). HTML export inlines SVG (add the vanilla `lucide` package). TSX imports from `lucide-react`. Covers the validator, prompt, app grammar (no more colored squares) and an inspector icon picker | `proof:icons` | `feat(ir): icon nodes across renderer, exports and generation` |
| **4.2 Token references** | M | `tokens` on nodes; resolver in `lib/canvas/design-style-to-css.ts`; inspector token chips; new DTCG import/export `lib/tokens/dtcg.ts`; generation emits refs when a token set exists | `proof:tokens`: changing a token updates every bound node; export emits CSS vars and a Tailwind theme | `feat(ir): design token references (DTCG)` |
| **4.3 Roles, a11y, semantic export** | M | `role` and `a11y` fields; ARIA in the renderer; HTML/TSX emit h1–h6, nav, ul/li, table and form controls; button handler props; generation requires roles | `proof:semantic-export` (the TSX compiles) | `feat(ir): semantic roles and accessible exports` |
| **4.4 Layout additions** (quick win) | S | sticky/fixed, `alignSelf`, all `justifyContent` values, arbitrary grid tracks, `textOverflow`/`lineClamp`, min/max, custom breakpoints (tablet + custom widths) | validator, renderer and export unit proofs | `feat(ir): app-grade layout primitives` |
| **4.5 Components as the unit** | L | `ComponentMaster` gains `props` (schema), `variants` (named axes) and `slots`; generation emits instances of project components; shells become masters | `proof:components-v2` | `feat(components): props, variants and slots` |
| **4.6 Component states** | M | `states` overrides (hover / pressed / focus / disabled / loading / selected); inspector state switcher; preview | unit proofs | `feat(components): interaction states` |
| **4.7 App Model** | L | `appModels` table plus `lib/app-model/` (surfaces, states, transitions, fixtures, acceptance); migrate from `screenRole`; Flow view and Coverage Matrix (designed / implemented / verified / missing per viewport) | `proof:app-model`: Billing with 6 states, valid transitions, correct coverage counts | `feat(app-model): screen-state graph and coverage matrix` |
| **4.8 Data slots and fixtures** | M | `repeat` binding; fixture editor; generators for names, long names, emails, amounts, dates, pseudo-localization and RTL | `proof:fixtures` | `feat(app-model): fixtures and data-bound repeats` |
| **4.9 Stress Test** (hero moment) | L | Recipes: empty, loading, error, forbidden, success, many, long-text, pseudo-loc, RTL, dark, 200% text, 320/375/tablet. All are rendered (2.1) and checked (2.2) into a pass/fail matrix with auto-fixes. "Design missing states" runs the engine with shell components, fixtures and taste, and adds the states to the App Model | `proof:stress-test`: a seeded screen yields the expected breakages; fixes clear them; generated states validate and use the shell master | `feat(stress-test): explode a screen into every state and fix what breaks` |
| **4.10 Screen sets v2** (audit #3) | M | Engine runs; shell master with slots; `complete / partial / failed` with missing ids; resume failed screens only; per-screen verification at the real viewport | `proof:screen-set-v2` | `feat(generation): screen sets that finish or say exactly what's missing` |
| **4.11 Component-true export** | M | Masters become separate TSX components with props; icons, tokens, state classes and handlers; HTML parity; ZIP | extend `proof:code-export` (tsc compile + render parity) | `feat(export): component-true React export` |

**M3 exit:** Stress Test live on a billing screen, plus Billing in 6 states with an edit scoped to one state versus all states.

---

## 9. Phase 5 — Atlas and the agent bridge (M4, M5)

A spec goes in `docs/superpowers/specs/` before starting. **5.12 must ship before any hosted (server-side) capture.**

| Task | Size | Scope | Gate | Commit |
|---|---|---|---|---|
| **5.1 Demo app + connector** | M | `examples/atlas-demo/`: Next.js + Tailwind with a billing flow, API routes and seeded states. `packages/connect/`: a CLI with device-flow or PAT auth, stack detection, and inventory of routes, components (props via TS types), tokens (Tailwind v4 `@theme`, CSS vars, DTCG) and fonts, uploaded as an `AppSnapshot` | `proof:connect-inventory` on the demo app | `feat(connect): connector CLI with app inventory` |
| **5.2 Source mapping** (spike first) | M | Dev-only `data-sos-id="file:line"`. Babel plugin for Vite/Babel; SWC plugin option for Next.js; runtime owner-stack fallback. Pattern: Onlook's `data-oid` | ≥ 95% of rendered demo components map to file:line | `feat(connect): dev-only source mapping` |
| **5.3 Capture engine** | L | Playwright run locally by the connector (localhost, preview, auth `storageState`): routes × viewports × themes, with a DOM snapshot (computed styles, boxes, text, images, SVG, source ids, component names) and a screenshot, uploaded as a `CaptureBundle` (assets to file storage) | `proof:capture` on the demo app | `feat(atlas): capture routes and viewports from a running app` |
| **5.4 State recipes** | L | Record a HAR, then derive recipes (empty / error / forbidden / loading / many / long-text) via request interception. Declarative `studio.states.ts` (`defineState`) covers SSR and auth-bound states. MCP `propose_state_recipes` lets the coding agent write recipes from the codebase | the demo billing flow is captured in ≥ 6 states | `feat(atlas): state recipes and fault injection` |
| **5.5 DOM → IR importer** | L | `lib/import/dom-to-design-node.ts`: flex, grid, typography, borders, shadows and backgrounds; wrapper flattening; icons; roles; token matching; component grouping; source ids | `proof:import-fidelity`: imported render vs original is within threshold on demo pages, with bounded wrapper depth | `feat(atlas): import captured DOM as editable design` |
| **5.6 Atlas view** | M | A surfaces × states grid; PNG thumbnails at low zoom and live render when focused; virtualized | pans at ≥ 50 fps with 100 states (manual perf QA) | `feat(atlas): atlas canvas view` |
| **5.7 Atlas Scan** | M | Checks (2.2) plus the judge (2.3) against approved revisions and references across all states; heatmap; top fixes; missing-state tiles from App Model expectations | seeded drift is detected on the demo app | `feat(atlas): scan the whole product` |
| **5.8 Direct → DesignChange** | L | Classify each edit as token, master or local; preview the ripple across states. The `DesignChange` builder captures scope, base/target revisions, semantic diff, preservation rules and acceptance checks (Appendix A) | `proof:design-change` | `feat(atlas): ripple edits into scoped design changes` |
| **5.9 MCP v2 + auth** | L | Output schemas with `structuredContent` and image content. Tasks extension for runs, falling back to `get_run`. New tools: `get_brief`, `get_taste`, `get_tokens`, `list_states`, `get_state_render`, `get_design_change`, `submit_evidence`, `review_change`, `propose_state_recipes`. Typed `write_canvas` ops as a discriminated union. OAuth 2.1 (managed authorization server vs self-hosted, evaluated in the spec) and scoped, expiring PATs (`read`, `write`, `generate`, `review`). An MCP App `ui://studio/review` compare panel. Plugins: update Cursor; add a Claude Code plugin and a Codex plugin with the `implement-design-change` and `design-missing-states` skills | `proof:mcp-v2`: output schemas validate, scopes are enforced, and the Tasks lifecycle works against a mock client | `feat(mcp): typed, visual, long-running tools with scoped auth` |
| **5.10 Ship loop** | L | `DesignChange` → agent → PR → preview URL → re-capture affected states → verify against target revisions (2.8) → `evidence` rows → MCP result and PR comment | the audit's Billing demo runs end to end on `examples/atlas-demo`, with evidence recorded | `feat(atlas): verified ship loop` |
| **5.11 Guard** | M | A GitHub App: check runs on PRs with preview deployments. Changed files map to affected routes (source map + route manifest), which are captured, compared and summarized with a before/after grid and a "fix with agent" link | a seeded PR fails with the correct states and a clean PR passes | `feat(atlas): PR guard` |
| **5.12 Capture security and privacy** | M | SSRF guard (block private, link-local and metadata ranges; re-check after redirects and DNS); sandboxed browser; encrypted auth state; PII redaction (fixtures by default, blur detected PII in public scans); retention and deletion; honor robots for public scans | `security:regression` extended with SSRF cases | `sec(atlas): capture sandboxing, SSRF guard and PII redaction` |

**M4 exit:** 5.1–5.7 live on the demo app.
**M5 exit:** 5.8–5.12 plus the recorded Billing run.

---

## 10. Phase 6 — Scale and growth (M6)

| Task | Size | Scope |
|---|---|---|
| **6.1 Public Taste Scan** | M | A `/scan` page with hosted capture of public URLs (requires 5.12). Shows an objective-checks-only Craft score, heatmap and top issues, a shareable OG image, and "Fix with Studio OS". Taste match appears only for signed-in users with references |
| **6.2 React Native / Expo** | L | A platform constraint pack (HIG/Material: touch targets, navigation patterns, safe areas); render constraints previewed through react-native-web; a code adapter (React Native + NativeWind); capture via Expo web first; verification |
| **6.3 Personal reranker** | L | Pairwise preferences + image embeddings + measured features feed a per-user Bradley–Terry reranker. Best-of-N candidates show a "predicted pick" whose accuracy is measured on held-out picks. Optional population prior |
| **6.4 Review workflow** | M | Comments on states, approvals, design-review states, follow-the-agent presence |
| **6.5 Interop** | M | Import/export taste (DTCG tokens + knob vector); Figma variables and components import to seed tokens and masters |

---

## 11. Proof gates index

**Existing (never skip):**
- `proof:session-continuity`
- `proof:convex-canvas-sync`
- `proof:canvas-save-throttle`
- `proof:code-on-canvas`
- `proof:agent-presence`
- `proof:agent-platform`
- `proof:app-ui-capability`
- `proof:code-export`
- `proof:multi-ref-fusion`
- `proof:section-regen`
- `proof:visual-loop-v2`
- `proof:visual-loop-mcp`
- `proof:design-node-taste`
- `proof:agent-design-harness`
- `proof:convex-auth-path`
- `security:regression`

**New, by phase:**

| Phase | Proofs |
|---|---|
| 0 | `render-fonts`, `intent-routing`, `taste-feedback`, `agent-runs`, `model-telemetry`, `convex-canvas-limits` |
| 1 | `design-memory`, `engine-pipeline`, `intent-measure`, `intent-engine`, `taste-compile`, `preferences`, `stream-parse`, `model-routes` |
| 2 | `render-parity`, `verify-checks`, `judge-contract`, `visual-loop-v3`, `impl-review`, `benchmark:v2` |
| 3 | `ops-merge`, `deep-tree-persist`, `migration-v2`, `undo-own-ops`, `presence`, `revisions` |
| 4 | `icons`, `tokens`, `semantic-export`, `components-v2`, `app-model`, `fixtures`, `stress-test`, `screen-set-v2` |
| 5 | `connect-inventory`, `capture`, `import-fidelity`, `design-change`, `mcp-v2` |

Each is a `scripts/*-proof.ts` using `node:assert/strict`, offline by default, with optional live base URLs (the existing convention). Add each as an npm script named `proof:<name>`.

---

## 12. Traceability: every finding → tasks

| Finding | Tasks |
|---|---|
| Audit 1: taste cache and reference identity | 0.3, 1.2, 1.4 |
| Audit 2: corrections persist, scope, undo | 0.3, 1.6, 1.8 |
| Audit 3: screen-set quality, completion, shared shell | 0.10, 4.5, 4.10 |
| Audit 4: explicit app state model | 4.7, 4.8, 4.9 |
| Audit 5: review against approved pixels, staleness | 2.8, 3.6, 5.10 |
| Audit 6: adapter contract, source mapping, round trip | 5.1–5.4, 5.8–5.10 |
| Audit 7: semantics and platform adapters | 4.1–4.6, 4.11, 6.2 |
| Audit 8: benchmark breadth and calibration | 2.3–2.5 |
| Audit: lint error, keyless visual-loop proof | 0.7 |
| Review 2.1: agents bypass taste | 0.4, 1.1, 1.2 |
| Review 2.2: Convex limits, base64 uploads | 0.6, 3.1–3.2 |
| Review 2.3: wrong fonts, fixed viewport | 0.1, 2.1 |
| Review 2.4: circular benchmark, self-judging | 2.3–2.5, 1.10 |
| Review 2.5: substring intent, URL-derived roles | 0.2, 1.4 |
| Review 2.6: archetype bottleneck, fake precision, 5/4 refs, low detail | 0.3, 1.3–1.5 |
| Review 2.7: harness inside a React component | 1.2 |
| Review 2.8: conflicts, undo reset, selection no-op, session state in doc | 0.5, 3.3–3.5 |
| Review 2.9: MCP timeout, untyped/image-less results, no Tasks/Apps/OAuth/scopes, CRUD-only skill | 0.10, 5.9 |
| Review 2.10: landing-page frame, grid limits, icons, sticky, knobs, status colors | 0.8, 4.1, 4.4, 1.7 |
| Review 2.11: no streaming, no caching, sequential screens, no cost data, pinned model | 1.9, 1.10, 0.9, 4.10 |
| Review 2.8 residue: session state stored in the shared document | 3.2, 3.4 |
| Skill/README drift | 0.7 |

---

## 13. Success metrics

Measured through `modelCalls`, `generationRuns`, `evidence` and benchmark v2.

- **North star: verified states per week.** Screen-states whose implementation passed Atlas verification against an approved revision.
- **Quality:**
  - harnessed-vs-raw pairwise win rate per category (target set after the first v2 run);
  - judge–human agreement (threshold set in 2.4);
  - corrections needed before approval;
  - state coverage (% of expected states designed / implemented / verified).
- **Speed:**
  - MCP tool acknowledgement under 5 s (0.10);
  - time to first streamed section (target set after 1.9 lands);
  - Atlas pans at ≥ 50 fps with 100 states.
- **Cost:** cost per approved screen; cache-hit share of input tokens (1.10).
- **Growth (M6):** Taste Scans run, shares, and scan → signup → connected repo conversion.

---

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope is too large for the team | Hard milestone gates; demo-first thin slices; the §0 lanes; later phases specified only when reached |
| A competitor ships something close (MagicPath has capture and sync; Taste Labs has verification) | Differentiate on *state-space* verification plus intent memory; ship the M3 Stress Test early; interoperate on taste profiles (6.5) |
| DOM → IR fidelity on complex apps | Start with Tailwind/shadcn-style React (where most vibe-coded apps live); measure fidelity (5.5); fall back to screenshot-backed atlas cells that can still be scanned |
| Forcing states for SSR / RSC apps | Declarative `studio.states.ts` plus agent-authored recipes (5.4) |
| Judge cost across many states | Deterministic checks first; judge only flagged or sampled states; cache by render hash; route cheap triage models (1.10) |
| Evaluator gaming (Goodhart) | Human calibration (2.4); rotating held-out sets; pairwise human spot checks each release |
| Captured apps contain PII or secrets | Local-first capture; fixtures by default; redaction; encrypted auth state; retention limits (5.12) |
| Convex limits and migration risk | 0.6 proof first; `SYNC_V2` flag with dual-write; round-trip proof (3.2) |
| Model churn | Per-step routes (1.10); re-baseline benchmark v2 on every model change |

**Kill or pivot criteria:**
- If import fidelity (5.5) misses its threshold after the spike, ship Atlas with screenshot cells plus source-mapped edits only.
- If judge–human agreement (2.4) stays below threshold, publish only the deterministic checks and keep the judge internal.

---

## 15. Plain-language summary

- **The idea.** Anyone can now get an AI to draw a screen. What nobody has is a tool that knows what *your whole product* should look like in every situation (empty, loading, error, on a phone, in German), checks what it *really* looks like, and makes the coding agents fix it before anything ships. That's **Atlas**.
- **How we get there.**
  1. Fix trust: fonts, intent guessing, taste reaching agents, no lost work.
  2. Make understanding visible (X-ray, Intent Card, sliders, Taste Memory).
  3. Make checking honest (a real renderer, real checks, an independent judge tuned to you).
  4. Rebuild storage so humans and agents can edit together.
  5. Teach designs about states, icons, tokens and real components (Stress Test).
  6. Connect to your real app and your agents (Atlas, Ship, Guard).
  7. Let the whole world scan their apps (Taste Scan).
- **Best long-term solution.** A model-agnostic design brain whose source of truth is a versioned app model: every screen-state, its semantic design and tokens, bound to code. Every generation and implementation is judged against an approved revision by an evaluator calibrated to you. Quality compounds with every project (learned, scoped preferences) and every model release (swappable generators). Verified coverage of every state is what incumbents and pure generators don't have.

---

## Appendix A — Contracts (TypeScript sketches)

```ts
// lib/design-memory/types.ts
export type ReferenceRole = "layout" | "typography" | "color" | "mood" | "imagery" | "components" | "ignore";

export type DesignBrief = {
  id: string; projectId: string; version: number; createdAt: number;
  goal: string; outputType: "marketing-site" | "web-app-ui" | "mobile-app-ui" | "component" | "multi-page-site";
  outputTypeConfidence: number;
  references: Array<{ assetId: string; weight: "primary" | "default" | "muted"; roles: ReferenceRole[];
                      regions?: Array<{ bbox: [number, number, number, number]; role: ReferenceRole }> }>;
  constraints: string[];
  conflicts: Array<{ dimension: string; options: string[]; resolution?: string }>;
  questions: Array<{ id: string; prompt: string; options: string[]; answer?: string }>; // ≤ 3
};

export type Provenance = { source: "measured" | "perceived" | "explicit" | "learned" | "fallback";
                           refIds?: string[]; preferenceId?: string; confidence: number };

export type TasteLayer = { projectId: string; kind: "derived" | "explicit" | "learned";
                           cacheKey?: string; data: unknown; provenance: Provenance[]; updatedAt: number };

export type Preference = {
  id: string; ownerId: string; projectId?: string;
  dimension: string; rule: string; value: unknown;
  scope: { level: "node" | "screen" | "project" | "user"; targetId?: string };
  evidence: { eventIds: string[]; count: number };
  confidence: number; status: "proposed" | "accepted" | "rejected";
  origin: "human-edit" | "agent-edit" | "variant-pick" | "inferred";
};

export type GenerationRun = {
  id: string; projectId: string; kind: "screen" | "screen-set" | "section" | "restyle" | "stress-test" | "benchmark";
  briefId?: string; inputHash: string;
  status: "queued" | "running" | "partial" | "complete" | "failed";
  steps: Array<{ key: string; status: "pending" | "running" | "done" | "failed"; startedAt?: number; endedAt?: number; error?: string }>;
  outputs: Array<{ kind: "section" | "tree" | "screen"; ref: string }>;
  missing?: string[]; costMicros?: number; createdAt: number; updatedAt: number;
};

// lib/verify/types.ts
export type ScanIssue = {
  id: string; itemId: string; stateId?: string; nodeId?: string; bbox?: [number, number, number, number];
  rule: "contrast" | "token-drift" | "spacing" | "overflow" | "touch-target" | "alignment" | "heading-order"
      | "alt-text" | "consistency" | "intent-drift" | "missing-state";
  severity: "info" | "warning" | "error";
  message: string; fix?: { kind: "auto"; ops: unknown[] } | { kind: "suggested"; instruction: string };
};

// lib/app-model/types.ts  (AppModel: see review §4.8)
export type StateRecipe = {
  id: string; surfaceId: string; name: string;
  kind: "empty" | "loading" | "error" | "forbidden" | "success" | "many" | "long-text" | "pseudo-loc" | "rtl"
      | "dark" | "text-200" | "viewport" | "custom";
  fixtureId?: string; viewport?: { width: number; height: number };
  network?: Array<{ match: string; status?: number; body?: unknown; delayMs?: number }>;   // Atlas capture
  setup?: string;                                                                           // studio.states.ts id
};

// Atlas
export type CaptureBundle = {
  appSnapshotId: string; route: string; stateId: string; viewport: { width: number; height: number };
  theme: "light" | "dark"; screenshotAssetId: string;
  dom: unknown; // normalized DOM snapshot: styles, boxes, text, images, svg, sourceIds, componentNames
  capturedAt: number; commitSha?: string;
};

export type DesignChange = {
  id: string; projectId: string;
  scope: { kind: "state" | "surface" | "component" | "token"; ids: string[] };
  baseRevisionIds: string[]; targetRevisionIds: string[];
  diff: { tokens?: Array<{ path: string; from: unknown; to: unknown }>;
          components?: Array<{ master: string; props?: unknown; variants?: unknown }>;
          layout?: Array<{ nodeId: string; change: string }>; newStates?: string[] };
  preserve: string[];            // e.g. "payment logic", "component public API", "no new dependencies"
  acceptance: Array<{ stateId: string; viewport: string; checks: ScanIssue["rule"][] }>;
  status: "draft" | "sent" | "implemented" | "verified" | "rejected";
};

export type Evidence = {
  id: string; changeId?: string; designRevisionId: string; stateId: string; viewport: string;
  commitSha?: string; previewUrl?: string; screenshotAssetId: string;
  review: { pass: boolean; issues: ScanIssue[]; judge?: { winner: "design" | "implementation" | "tie"; confidence: number } };
  createdAt: number;
};
```

**MCP v2 tool surface (5.9):**
- Every tool returns typed `structuredContent`.
- Renders are image content.
- Long operations use Tasks (falling back to `get_run`).
- Handles are explicit: `briefId`, `runId`, `designRevisionId`, `changeId`.

| Tool | Scope |
|---|---|
| `list_projects` | read |
| `get_canvas` | read |
| `get_node` | read |
| `get_brief` | read |
| `get_taste` | read |
| `get_tokens` | read |
| `list_states` | read |
| `get_state_render` | read |
| `get_screen_design` | read |
| `create_run` / `get_run` | generate |
| `write_canvas` (typed ops) | write |
| `propose_state_recipes` | write |
| `get_design_change` | read |
| `submit_evidence` | review |
| `review_change` | review |

## Appendix B — Convex tables (sketch; finalize in the 1.1 and 3.2 specs)

| Table | Key fields | Indexes |
|---|---|---|
| `projectDesignState` (0.4, migrated in 1.1) | projectId, ownerId, tasteProfile, designTokens, updatedAt | by_project |
| `modelCalls` (0.9) | ownerId, projectId?, runId?, step, model, tokensIn, tokensOut, cachedIn, latencyMs, costMicros, ok, createdAt | by_run, by_owner_day |
| `agentRuns` → `generationRuns` (0.10 / 1.1) | per `GenerationRun` | by_project, by_status |
| `assets` | ownerId, projectId?, storageId, url, hash, width, height, mime, source | by_hash, by_project |
| `referenceAnalyses` | assetId, analyzerVersion, measured, perceived, confidence | by_asset_version |
| `designBriefs` | per `DesignBrief` | by_project_version |
| `tasteLayers` | projectId, kind, cacheKey?, data, provenance | by_project_kind |
| `preferences` | per `Preference` | by_owner, by_project_status |
| `tokenSets` | projectId, name, dtcg, modes | by_project |
| `evalLabels` (2.4) | pairId, labeler, choice, reason | by_pair |
| `canvasItems` / `artboardDocs` / `canvasOps` (3.2) | item metadata / node map per artboard / op log (capped) | by_project, by_item |
| `designRevisions` (3.6) | itemId, stateId?, tree, tokens, fixtureId?, viewport, renderHash, approvedBy | by_item, by_state |
| `presence` (3.4) | projectId, actor, kind, selection, cursor, expiresAt | by_project |
| `appModels` (4.7) | projectId, model (versioned) | by_project |
| `appSnapshots` / `captures` / `designChanges` / `evidence` (5.x) | per the contracts above | by_project, by_change, by_revision |
