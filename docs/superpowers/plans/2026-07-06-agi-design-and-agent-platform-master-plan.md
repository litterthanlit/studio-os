# AGI Design + App-UI + Agent Platform — Master Execution Plan

**Date:** 2026-07-06
**Status:** Approved direction — execution-ready for Composer
**Author:** CEO/COO session (audit-verified against repo state at `54f4f15`)
**Supersedes:** Nothing. Builds on `54f4f15` (visual refine loop v1 + MCP surface), `36c2721` (Convex migration), `0be7b83` (agent design harness).

---

## Strategic intent

Two product goals, one plan:

1. **"AGI in design"** — Studio OS should truly analyze and understand references and produce the design the user had in mind. The mechanism: a real see-your-own-output loop, multi-reference structural fusion, and less lossy taste compression.
2. **App design + agent-native** — Studio OS designs *apps* (dashboards, settings, mobile screens, multi-screen flows), not just marketing sites, and coding agents (Cursor, Claude Code, Composer) can connect to it mid-build to request, review, and pull designs. Designers first; developers as the second wedge.

The category position: Figma's MCP is read-only handoff; v0/Lovable generate code with no taste calibration. Studio OS = taste harness + visual self-critique + agent-addressable canvas. Nobody holds that spot.

---

## Verified current state (do NOT re-audit; this is accurate as of `54f4f15`)

| Area | Status | Detail |
|------|--------|--------|
| Visual refine loop | PARTIAL | `lib/canvas/visual-refine-loop.ts` — Puppeteer screenshot via `lib/canvas/design-node-screenshot.ts`, vision scoring in `lib/canvas/design-taste-evaluator.ts:353-441` (model sees pixels when SCORING). But: exactly 1 retry, retry prompt is text-critique-only (screenshot NOT sent to regeneration, `visual-refine-loop.ts:112-119`), runs on base tree only (variants unrefined), only in `mode === "variants"`. |
| Composition wiring | DONE | `compositionContext` flows UI → `/api/taste/extract` → generate prompt (`PromptComposerV2.tsx:787-861`, `design-tree-prompt.ts:462-467`). |
| Multi-ref fusion | MISSING | `selectPrimaryComposition()` in `lib/canvas/composition-blueprint.ts:90-106` still picks ONE reference's structure; others contribute only prose summary + first `secondaryTrait` note. |
| Section regen API | BROKEN | Clients (`PromptComposerV2.tsx:608-624`, `LayersPanelV3.tsx:874-891`) send `mode: "single"` + `useDesignNode: true` expecting `data.variants[0].pageTree`; the non-variants branch of `generate-component/route.ts` (~1351-1407) returns legacy `{ code, name }` TSX. |
| Convex canvas | SCHEMA-ONLY | `convex/projects.ts:77-152` has `loadCanvas`/`saveCanvas` with revision conflict + snapshots; editor still persists to localStorage only (`lib/canvas/canvas-context.tsx`, key `studio-os:canvas-v3:{projectId}`). Nothing calls the Convex functions. |
| MCP server | PARTIAL | `mcp-server/index.ts` — 3 stateless tools (`get_design_contract`, `request_design`, `submit_screenshot_for_review`) wrapping `app/api/agent/*`. Caller must pass full `canvasState`/`tokens`/`tasteProfile` every call. `AGENT_CONTEXT_TOOLS` in `lib/canvas/agent-design-contract.ts:20-35` names 14 tools; 3 exist. |
| Agent auth | INCONSISTENT | `app/api/agent/*` accept `x-studio-os-service-secret` via `lib/agent/agent-api-auth.ts`; but `request-design` proxies to `/api/canvas/generate-component` which requires Convex Bearer (`requireAuth: true`) and ignores the service secret — so `request_design` is broken in production without a user JWT. |
| Code export | HTML-ONLY (V6) | Active export = inline-style HTML + ZIP (`lib/canvas/design-node-to-html.ts`, `build-export-zip.ts`). TSX/Tailwind exporters exist only for legacy PageNode (`lib/canvas/export-formats.ts`, dead `ExportActions.tsx`). No `designNodeToTSX`. |
| App-UI capability | WEAK | 5 DesignNode primitives (fine — apps are frames), but archetype grammars in `design-tree-prompt.ts:55-407` are all marketing/landing. `intent-profile.ts` detects `app-ui` from keywords but no grammar switches on it. No multi-screen/flow model; one artboard per site; `AppStructure` in the design contract is name-inferred from artboards. Breakpoints: desktop(1440)/mobile(375) only. |
| Embeddings/RAG | DEAD | `/api/search` returns `mode: "unavailable"`; `/api/ai/embed` stubbed; Convex `embedding` fields never queried. |

Existing proof scripts: `proof:visual-loop-mcp`, `proof:agent-design-harness`, `proof:design-node-taste`, `security:regression`. Puppeteer degrades gracefully when Chromium is missing (`STUDIO_OS_DISABLE_SCREENSHOT`, `design-node-screenshot.ts:69-83`).

---

## Phase map & sequencing

```
Phase 1  Visual loop v2 (AGI feel)          ─┐
Phase 2  Multi-ref fusion + taste fidelity   ├─ independent, can parallelize
Phase 3  Fix section-regen contract          ─┘  (Phase 3 first if only one agent)

Phase 4  Convex canvas source of truth      ── prerequisite for Phase 5
Phase 5  Agent platform v1 (auth + MCP CRUD)── prerequisite for Phase 7 usefulness
Phase 6  App-UI design capability           ── independent of 4/5; needs 1-3 landed for quality
Phase 7  Code-grade export (React+Tailwind) ── after 6 (exports app shells too)

Deferred: embeddings/RAG activation, tablet breakpoint, prototype hotspot links, Figma import.
```

Hotspot files — sequence, never parallelize edits to: `app/api/canvas/generate-component/route.ts`, `lib/canvas/design-tree-prompt.ts`, `lib/canvas/canvas-context.tsx`, `lib/canvas/unified-canvas-state.ts`.

---

## Phase 1 — Visual loop v2: the model sees and fixes its own output

**Goal:** Convert the v1 "score once, retry blind" loop into a genuine iterative see-critique-fix loop. This is the single biggest "AGI feel" lever.

### Task 1.1 — Feed the screenshot into the refine regeneration

- File: `lib/canvas/visual-refine-loop.ts`
- Today the retry prompt sends text critique + reference images. Change the regeneration call to ALSO attach the screenshot of the failing render as a vision block, with an instruction block like: "Image 1..N are the user's references. The final image is YOUR previous attempt, which scored X/10. Issues: <critique>. Regenerate the tree fixing these issues while keeping what works."
- Keep `low` detail for refs, use higher detail for the self-screenshot (it is the subject of critique).
- Acceptance: refine call payload contains the render screenshot; proof script asserts message structure.
- Commit: `feat(visual-loop): send render screenshot to refine regeneration`

### Task 1.2 — Bounded multi-iteration refine

- File: `lib/canvas/visual-refine-loop.ts`, config surfaced in `app/api/canvas/generate-component/route.ts`
- Replace single-retry with a loop: up to `STUDIO_OS_VISUAL_REFINE_MAX_ITERATIONS` (default 2, hard cap 3). Each iteration: screenshot → score → if below threshold and score improved vs previous, refine again; stop on threshold pass, score regression, or cap. Always return the best-scoring tree seen.
- Log per-iteration scores into `v6Debug` (`visualRefineIterations: Array<{ score, applied }>`).
- Guard total added latency: skip further iterations if elapsed refine time exceeds ~40s.
- Acceptance: loop terminates on all paths; best tree wins; debug trace present.
- Commit: `feat(visual-loop): bounded multi-iteration refine with best-tree selection`

### Task 1.3 — Refine the pushed variant too (cheap pass)

- File: `app/api/canvas/generate-component/route.ts` (variant derivation section, ~751+)
- After pushed/restructured derivation, run ONE screenshot+score pass on each derived variant (no regeneration — scoring only) and attach `visualScore` to each variant's debug payload. If a derived variant scores catastrophically below base (>2.0 gap), drop it and re-derive once.
- Rationale: variants currently transform JSON blind; this catches degenerate variants without doubling generation cost.
- Commit: `feat(visual-loop): score derived variants, re-derive on catastrophic regression`

### Proof gate P1

Extend `scripts/visual-loop-mcp-proof.ts` (or add `scripts/visual-loop-v2-proof.ts` + npm script `proof:visual-loop-v2`): assert message structure of refine call includes screenshot block, iteration cap honored with mocked scores (fail→fail→pass and fail→regress paths), best-tree selection correct. Run with `STUDIO_OS_DISABLE_SCREENSHOT` unset locally if Chromium available; must still pass (mocked) without Chromium.

---

## Phase 2 — Multi-reference fusion + taste fidelity

**Goal:** "It understood my references" — plural. Stop dropping every reference except the primary.

### Task 2.1 — Fused composition blueprint

- File: `lib/canvas/composition-blueprint.ts`
- Replace single-primary output with a fused blueprint:
  - Primary reference (existing selection logic) still anchors STRUCTURE (section inventory, grid, pacing).
  - Each non-muted secondary reference contributes a labeled influence block: its `keyCompositionalMove`, spacing system, typographic density, and (for photographs) mood/color story — max ~3 lines each, capped at 4 secondaries.
  - Weighted: starred secondaries listed before default ones; muted excluded (unchanged).
  - Emit as `## COMPOSITION BLUEPRINT` (primary structure) + `### SECONDARY INFLUENCES` (fused traits) so the generation model receives explicit "structure from A, texture from B, palette mood from C" instructions.
- Keep the output size bounded (~40 lines max) — prompt budget matters.
- Acceptance: blueprint contains one block per non-muted reference; primary still anchors structure; snapshot test in proof script.
- Commit: `feat(taste): fuse secondary reference influences into composition blueprint`

### Task 2.2 — Carry numeric structure into TasteProfile

- Files: `types/taste-profile.ts`, `app/api/taste/extract/route.ts`, `lib/canvas/directive-compiler.ts`
- Add optional structured fields to `TasteProfile`: `spacingSystem?: string` (e.g. "8px base"), `typeScale?: { display?: number; heading?: number; body?: number }` (px), `measuredDensity?: string`. Populate from composition analyses when available (pass-through from `compositionContext` extraction, not a new model call).
- `directive-compiler.ts`: when `spacingSystem`/`typeScale` present, emit HARD directives with the numbers instead of enum-derived prose (e.g. "Section padding must be multiples of 8px; display type 72-96px").
- Backward compatible: all fields optional; absent → current behavior.
- Commit: `feat(taste): numeric spacing/type-scale fields flow from composition analysis to directives`

### Proof gate P2

Script asserting: 3-ref fixture (1 starred screenshot, 1 editorial, 1 photo) produces blueprint with 1 structure block + 2 influence blocks; TasteProfile with `typeScale` produces numeric HARD directive; empty/legacy profiles unchanged output.

---

## Phase 3 — Fix the section-regen API contract (bug, ship first if solo)

**Goal:** Section-level "Regenerate similar/different" actually returns DesignNode output. Small, high-value, currently silently broken.

### Task 3.1

- File: `app/api/canvas/generate-component/route.ts` (non-variants branch ~1351-1407)
- When `useDesignNode: true` and `mode` is not `"variants"`, run the V6 single-tree path (prompt build with section context, generation, validation, media resolution, taste gate — NO visual refine loop here, latency-sensitive) and return `{ variants: [{ pageTree, ... }] }` matching what `PromptComposerV2.tsx:608-624` and `LayersPanelV3.tsx:874-891` already parse. Preserve legacy TSX response for `useDesignNode: false` callers.
- Verify both client call sites work end-to-end with dev bypass; keep response shape identical to the variants path's element type.
- Commit: `fix(generation): section regen returns DesignNode variants when useDesignNode is set`

### Proof gate P3

Manual: dev server, right-click section → Regenerate similar → section replaced with new DesignNode subtree (not TSX error). Plus a fetch-based script hitting the route with `mode: "single", useDesignNode: true` asserting `variants[0].pageTree` exists.

---

## Phase 4 — Convex canvas as source of truth

**Goal:** The canvas becomes server-readable/writable. Prerequisite for every agent feature. The backend already exists (`convex/projects.ts:77-152` with revision conflict handling + snapshots); this phase wires the editor.

### Task 4.1 — Editor read path

- Files: `lib/canvas/canvas-context.tsx`, `lib/canvas/unified-canvas-state.ts`
- On provider mount with an authenticated user: query `api.projects.loadCanvas`. Reconcile with localStorage by `revision`/`updatedAt` — newest wins; localStorage remains the offline/draft cache (per CLAUDE.md data-layer direction). Unauthenticated/dev-bypass sessions: current localStorage behavior unchanged.
- Do not regress the synchronous hydration gate (see Canvas Persistence Fix history — StrictMode unmount race).

### Task 4.2 — Editor write path

- File: `lib/canvas/canvas-context.tsx`
- Extend the existing 500ms-debounced save: write to localStorage synchronously (unchanged) AND enqueue a Convex `saveCanvas` mutation (throttled ~3-5s, with revision; on conflict, refetch and last-write-wins with a console warning — no merge UI in v1).
- Never block or slow canvas interaction on network state; Convex save is fire-and-forget with retry-once.

### Task 4.3 — Poll-based remote refresh (minimal)

- When the editor tab regains focus, re-check `loadCanvas` revision; if remote is newer (e.g. an agent wrote), show a small toast "Canvas updated externally — Reload" (no live merge in v1).

- Commits: `feat(canvas): load canvas from Convex with localStorage reconciliation`, `feat(canvas): persist canvas to Convex on debounced save`, `feat(canvas): detect external canvas updates on focus`

### Proof gate P4

Manual with two browser contexts (or one browser + a script calling `saveCanvas` via Convex client): edit in A → reload B shows edit; script-side write → focus editor → toast appears. Also: dev-bypass (no auth) path still fully functional on localStorage alone.

---

## Phase 5 — Agent platform v1: coherent auth + project-scoped MCP

**Goal:** A Cursor/Composer user can point the MCP server at their project and (a) read the design, (b) request designs that land ON the canvas, (c) submit screenshots of their implementation for visual review. Depends on Phase 4.

### Task 5.1 — Unify agent auth

- Files: `lib/agent/agent-api-auth.ts`, `app/api/canvas/generate-component/route.ts`, `app/api/agent/request-design/route.ts`
- Fix the production break: `request-design` must not proxy into a Bearer-only route. Either (preferred) extract the V6 generation core out of the route into `lib/canvas/generate-design-core.ts` and call it directly from `request-design` under `authorizeAgentRequest`, or honor the agent auth on `generate-component`. Pick the extraction — it also cleans up the 1400-line route.
- Add per-project scoping: agent requests carry `projectId`; service-secret auth is deployment-admin (existing behavior), Bearer auth checks project ownership via Convex.
- Commit: `refactor(generation): extract V6 core; agent request-design works without user Bearer`

### Task 5.2 — Canvas read/write agent routes

- New files: `app/api/agent/canvas/route.ts` (GET-style POST `{ projectId }` → full `UnifiedCanvasState` + tasteProfile + tokens from Convex; POST `{ projectId, operations }` → apply writes)
- Write operations v1 (keep surface tiny and safe): `add_artboard` (name, breakpoint, DesignNode tree — validated through `validateAndNormalizeDesignTree`), `replace_artboard_tree` (artboardId, tree), `add_reference` (imageUrl). No arbitrary item mutation in v1.
- All writes go through Convex `saveCanvas` with revision handling; all trees through the validator. Rate-limit like other routes.
- Commit: `feat(agent): canvas read/write API with validated artboard operations`

### Task 5.3 — Expand MCP server to project-scoped tools

- File: `mcp-server/index.ts`
- New tools (stateful — take `projectId`, no more passing whole canvasState):
  - `list_projects` (Bearer-auth path; Convex projects for the user)
  - `get_canvas(projectId)` → canvas summary: artboards (id, name, breakpoint, section names), references, taste summary, tokens
  - `get_screen_design(projectId, artboardId, format: "designnode" | "html")` → tree or rendered HTML via `designNodeToHTML`
  - `generate_screen(projectId, prompt, options)` → runs generation core WITH the project's stored taste/tokens/references, writes result to canvas via 5.2, returns artboardId + summary. This is the marquee tool: agent asks for a design, it appears on the user's canvas AND comes back as structured data.
  - `review_implementation(projectId, artboardId, screenshotDataUrl)` → reuses visual-review scoring against the stored canvas + references (replaces caller-supplied-state version; keep old tool for compat).
  - Keep existing 3 tools working.
- Update `mcp-server` docs header with setup for Cursor (`.cursor/mcp.json` example) and required env.
- Commit: `feat(mcp): project-scoped tools — get_canvas, get_screen_design, generate_screen, review_implementation`

### Proof gate P5

Script `scripts/agent-platform-proof.ts` (npm `proof:agent-platform`): with dev server + dev bypass — `get_canvas` returns seeded starter project; `generate_screen` (mock or live model per `OPENROUTER_API_KEY` presence) writes an artboard visible in a subsequent `get_canvas`; invalid tree rejected by validator; write without auth rejected in production-mode simulation. Manual: connect the MCP server to Cursor locally, run `generate_screen`, watch the artboard appear on canvas (focus-toast from Task 4.3).

---

## Phase 6 — App-UI design capability

**Goal:** "Design a settings screen / analytics dashboard / mobile onboarding flow" produces credible app UI, not landing-page sections. Keep the 5-primitive DesignNode model — app shells are frames; the gap is grammar + screen model, not node types.

### Task 6.1 — App-shell archetype grammars

- File: `lib/canvas/design-tree-prompt.ts` (hotspot — solo edit)
- Add two archetypes with the same few-shot rigor as `premium-saas`:
  - `app-dashboard`: app shell few-shot — fixed sidebar frame (nav items as icon+label button rows), top bar, content area with stat cards, data-table pattern (header row frame + repeated row frames with grid columns), empty-state pattern. Explicit anti-landing rules: no hero, no marketing CTA band, no footer.
  - `app-mobile`: 375px shell — status-bar-safe top area, screen title, list rows / cards, bottom tab bar (5 icon buttons), form field pattern (label + input-styled frame), primary action button pinned pattern.
- Grammar selection: when `IntentProfile.outputType === "web-app-ui"` (already detected in `types/intent-profile.ts:73-87`), override archetype grammar to `app-dashboard` (or `app-mobile` when prompt/breakpoint indicates mobile) regardless of tasteProfile archetype — taste still drives color/type/spacing directives.
- Commit: `feat(generation): app-dashboard and app-mobile archetype grammars with intent routing`

### Task 6.2 — Screen-set generation (multi-screen flows)

- Files: `app/api/canvas/generate-component` core (post 5.1 extraction), `lib/canvas/unified-canvas-state.ts`, reducer
- New generation mode `screens`: prompt like "settings, billing, and members screens for a team SaaS" → model first emits a screen plan (JSON list: id, name, purpose, key elements — one cheap call), then generates each screen's tree with shared shell context (sibling summaries via the existing `section-context-builder.ts` pattern) so nav/shell stays consistent across screens.
- Canvas: one artboard per screen, laid out in a row, sharing `siteId`; add `screenRole?: string` to `ArtboardItem` (additive, optional).
- Expose in MCP as `generate_screen_set` and in the prompt panel as a mode when intent is app-ui.
- Commit: `feat(generation): multi-screen app generation with shared shell context`

### Task 6.3 — Authored AppStructure (contract stops guessing)

- Files: `types/agent-design-harness.ts`, `lib/canvas/agent-design-contract.ts`
- When artboards carry `screenRole`/screen-plan metadata (from 6.2), build `AppStructure` from it instead of name-string inference; fall back to inference for legacy boards. Design Contract and MCP `get_canvas` both benefit.
- Commit: `feat(agent): design contract uses authored screen metadata`

### Proof gate P6

Manual (primary): generate "analytics dashboard for a fitness app" → sidebar shell, no hero/footer; generate 3-screen settings flow → 3 artboards, consistent shell, correct names. Screenshot artifacts. Scripted: intent routing unit assertions (prompt "dashboard" → app-dashboard grammar selected; "landing page" → unchanged).

---

## Phase 7 — Code-grade export: DesignNode → React + Tailwind + tokens

**Goal:** Agents and developers get codebase-ready output, not inline-style HTML soup. After Phase 6 so app shells export too.

### Task 7.1 — `designNodeToTSX`

- New file: `lib/canvas/design-node-to-tsx.ts`
- DesignNode tree → single TSX file: functional component per artboard, Tailwind classes where a clean mapping exists (flex/grid/spacing/radius/typography via nearest-token), `style={{}}` escape hatch for exact values with no Tailwind equivalent (gradients, clip-paths, precise px). Component masters → separate exported components; instances → usage with override props where feasible, else inlined. Text content real; images as `<img>` with the resolved URLs.
- Use legacy `renderNodeToTailwind` in `lib/canvas/export-formats.ts` as reference only — do not couple to PageNode.

### Task 7.2 — Tokens artifact + ZIP upgrade

- Files: `lib/canvas/build-export-zip.ts`, new `lib/canvas/design-tokens-export.ts`
- Emit `tokens.css` (CSS custom properties) + `tailwind.tokens.js` (theme extend fragment) from `DesignSystemTokens` + tasteProfile palette. ZIP gains `Component.tsx` + tokens files alongside `index.html`.

### Task 7.3 — Surface in ExportTab + MCP

- Files: `app/canvas-v1/components/inspector/ExportTab.tsx`, `mcp-server/index.ts`
- ExportTab: format selector gains "React + Tailwind"; Copy TSX + ZIP include. MCP `get_screen_design` gains `format: "tsx"`.
- Commits: `feat(export): designNodeToTSX with Tailwind mapping`, `feat(export): design tokens artifacts in ZIP`, `feat(export): React export in ExportTab and MCP`

### Proof gate P7

Script: export starter-canvas artboard → TSX compiles (`tsc --noEmit` on a temp file with React types) and renders in a scratch Vite/Next page visually matching the HTML export (manual screenshot compare). MCP `get_screen_design(format:"tsx")` returns compilable code.

---

## Deferred (explicitly out of scope for this plan)

- Embeddings/RAG activation (`/api/search`, Convex vector search) — amplifier, not foundation; revisit after P5.
- Tablet breakpoint / arbitrary breakpoints.
- Prototype hotspot links / clickable flows between screens (screen-set generation ships without navigation simulation).
- Import-from-codebase (DOM/React → DesignNode). Big; own spec later.
- Figma import/export.
- Real-time multiplayer / live merge (Phase 4 ships last-write-wins + focus toast only).

---

## Execution rules for Composer

- One phase per branch/PR unless trivially small; commit per task with the messages above.
- Read `CLAUDE.md` constraints before touching canvas code (`PUSH_HISTORY` before mutation, `activeItemId` not `activeArtboardId`, `getNodeTree()`/`withUpdatedTree()`, design-system rules for any UI).
- Hotspots (`generate-component/route.ts`, `design-tree-prompt.ts`, `canvas-context.tsx`, `unified-canvas-state.ts`): never edit in parallel tasks.
- Every phase ends with its proof gate run + manual QA where specified; do not mark a phase complete on build-passes alone. Features require a user-facing path.
- Model calls cost money: use `STUDIO_OS_DISABLE_SCREENSHOT` + mocked scorers in scripts by default; live-model proof runs only when `OPENROUTER_API_KEY` is present.
- Update `AGENTS.md` "Current project state" after each shipped phase.
