# Studio OS — Architecture Review: from Design Harness to Design Brain

**Date:** 2026-09-22
**Status:** Proposal. Needs CEO approval before any phase starts.
**Reviewed:** commit `cdae17d` (the same commit as the 2026-09-18 capability audit). Source review, targeted local executions, and external research. No production data or application code was changed.
**Builds on:** `AGI Design + App-UI + Agent Platform — Master Execution Plan.md` (Phases 1–7 shipped) and the 2026-09-18 audit. Does not reopen debut, PageNode/V5, or the V6 renderer.

---

## 0. Verdict

1. **The audit is accurate.** All eight findings reproduce at `cdae17d` (§1). Its sequence is right: make understanding trustworthy → prove an existing-app loop → states and a second platform → scale.
2. **The audit treats symptoms.** Most of its findings, and the new ones below, come from six structural root causes (§3). Fixing them one at a time produces the ~5% steps that `AGENTS.md` warns are a ceiling signal.
3. **Three new findings change priorities:**
   - **Agents get no taste.** Taste profile and tokens live only in browser localStorage. MCP `generate_screen` runs with `tasteProfile: null` and default tokens, which also skips the visual refine loop and variant derivation. Agents cannot reach the product's core differentiator.
   - **The quality signal is compromised.** Self-critique screenshots load no real fonts (the only font URL returns HTTP 400). The benchmark grades a text summary against the same taste profile that generated the output. "Delta +4" measures directive compliance, not "the design you had in mind".
   - **Persistence has a ceiling.** The whole canvas is one Convex `v.any()` document; Convex documents 1 MiB and 16 nesting levels as limits. The repo's own app-dashboard few-shot already measures 15 levels inside that document, and adding one data table makes it 20. Uploaded references are stored inline as base64.
4. **Strategic reframe.** Since spring 2026, incumbents ship generation plus agent write access: Figma `use_figma`, the Google Stitch MCP, pen.dev, Cursor Design Mode, and Anthropic's Claude Design. Raw generation is no longer a moat, and the raw baseline behind "+4" has moved. Studio OS should become **the design brain agents plug into**. It should remember taste, ground itself in references and the real codebase, model every screen-state, and verify outcomes. The generator becomes a swappable part.

---

## 1. Audit verification

| # | Audit finding | Verdict at `cdae17d` | What to add |
|---|---|---|---|
| 1 | Taste cache ignores brief and weights | Confirmed. `buildSignature` (`app/api/taste/extract/route.ts:260`) omits `prompt` and `referenceWeights` and sorts URLs. | Only the first 5 references are sent as images (`:806`), while the prompt says "Analyze these N references". The cache is a per-instance in-memory `Map`, so results differ across serverless instances. |
| 2 | Corrections only partly persist | Confirmed. The palette branch is empty (`PromptComposerV2.tsx:485`) and structural `suggestedOverride`s are dropped. | It is worse than reported. Refresh (`:511`) replaces the profile and **wipes `userOverrides`**. Generation never re-extracts once a profile exists (`:828`), so the profile is either stale or loses what it learned. The edit baseline `generatedTreeSnapshot` is session-only (`lib/canvas/unified-canvas-state.ts:99`), so corrections made before a reload are never detected. |
| 3 | Screen sets have weaker guarantees | Confirmed. There is no visual loop, failed screens are skipped (`lib/canvas/generate-screen-set-core.ts:293`), a run succeeds if one screen exists (`:331`), and shell context is just names (`lib/canvas/screen-context-builder.ts:55`). | Screens run sequentially at 16k tokens each. Over remote MCP the 60-second route cap (§2.9) makes 3+ screen sets impractical. |
| 4 | App state model is shallow | Confirmed. `inferStates` matches name substrings, and there is one flow. | The HARD palette rule allows only the profile's 4–5 hexes ("MUST use only"), so error, success and warning states cannot use status colors without "violating taste" (§2.10). |
| 5 | Review ignores the approved artboard's pixels | Confirmed. `comparedAgainstArtboard: artboardId` is only a label (`app/api/agent/review-implementation/route.ts:98`). | The route also needs a caller-supplied `tasteProfile` because none exists server-side. The judge uses `detail: "low"` and is primed with the profile's enums. |
| 6 | No durable node↔source mapping | Confirmed. | The MCP layer also has transport, timeout and typing gaps (§2.9). |
| 7 | Visual primitives only | Confirmed. Frames export as `div`, text as `<p>` (`lib/canvas/design-node-to-tsx.ts:393`), and buttons have no handlers. | There are no icons on the V6 path. `content.icon` (`lib/canvas/design-node.ts:153`) is ignored by the V6 renderer and both exporters; only the legacy PageNode renderer prints it as raw text. The app grammar therefore draws icons as colored squares. Neither the HTML nor the TSX exporter emits headings. |
| 8 | Quality evidence is narrow | Confirmed. | The scorer is circular (§2.4). |

Also confirmed: the lint error at `app/canvas-v1/components/inspector/CodeItemInspector.tsx:22` (a ref written during render).

---

## 2. Findings the audit missed

Severity reflects impact on the stated vision: "understands my references", "any app, any state", "agent-native".

### 2.1 Critical — agents bypass the taste harness

- The taste profile is stored in `ProjectState.canvas.tasteProfile` through `upsertProjectState`, which writes localStorage (`lib/project-store.ts:64`). Convex has no taste or token table (`convex/schema.ts`).
- `/api/agent/generate-screen` generates with `tasteProfile ?? null` (`route.ts:77`) and `designTokens ?? defaultDesignTokens()` (`:70`). The MCP `generate_screen` tool has no taste or token inputs.
- With no taste profile, `generateV6DesignVariants` skips the visual refine loop and variant derivation, because both are gated on `tasteProfile`. It also passes no composition blueprint.
- `get_canvas` returns `tasteProfile: null` and default tokens (`app/api/agent/canvas/route.ts:85`).

**Impact:** every agent-originated screen is a raw generation with reference images attached. The harness advantage does not exist on the agent path.

### 2.2 Critical — persistence ceiling (verify first)

- `canvasDocuments.state: v.any()` holds the entire canvas (`convex/schema.ts:97`). The [Convex data types docs](https://docs.convex.dev/database/types) put values under 1 MB with at most 16 levels of nesting.
- **Measured** (Appendix A): the app-dashboard few-shot in `lib/canvas/design-tree-prompt.ts` is 6 DesignNode levels, which is 15 container levels inside `state`. Adding one table › row › cell › text makes it 20.
- Uploaded references go through `fileToDataUrl` (`app/canvas-v1/components/UnifiedCanvasView.tsx:70`) and are stored as full-resolution base64 in the same document. The 400px limit only sets the on-canvas display size. One phone photo can exceed 1 MiB. Any AI request carrying one exceeds the enforced 512 KB body cap (`lib/security/api-guard.ts:42`).
- Snapshots copy the whole blob, and 20 are kept per document.

**Action:** add a proof script against a dev deployment before anything else. If the limits bite, this is a data-loss risk: the editor retries and falls back to localStorage, and agent writes return 502.

### 2.3 Critical — self-critique judges mis-rendered pixels

- The screenshot document loads `family=Geist+Sans` (`lib/canvas/design-node-screenshot.ts:21`), which returns **HTTP 400**; the Google Fonts family is `Geist`. `designNodeToHTML` emits no font links, and serverless Chromium has few system fonts.
- As a result, every screenshot used by `runVisualRefineLoop`, `guardDerivedVariantVisualScore` and `review_implementation` renders fallback fonts. The judge scores typography, and the loop regenerates against a rendering the user never sees.
- The viewport is fixed at 1280 (`:10`), while desktop artboards are 1440 and mobile artboards 375.
- The same gap affects V6 HTML/ZIP export and `/published/[id]`. The editor loads Google and Fontshare fonts (`lib/fonts/load-font.ts`), but the render and export path loads neither.

### 2.4 High — evaluation is circular and not independent

- The benchmark scorer `scoreDesignRealtimeFidelity` (`lib/canvas/design-taste-evaluator.ts:247`) has an LLM read a **text summary** of the tree and grade it against the **same TasteProfile** that produced the harnessed output. Raw runs never saw that profile, so the delta mostly measures instruction-following.
- The screenshot judge `scoreDesignBenchmarkFidelity` (`:353`) has several weaknesses:
  - It is the generator's own model family, which risks self-preference bias. Anthropic's harness article argues for a separate, skeptical, calibrated evaluator.
  - It sends images at `detail: "low"`, primes the judge with the profile's enums, takes a single sample, and uses uncalibrated thresholds (7.25).
  - It renders with the wrong fonts (§2.3).
- Coverage is one editorial set (BS-01). The raw baseline was measured on the model pinned in spring (`SONNET_4_6`, `lib/ai/model-router.ts:7`), and newer models raise it.
- **Consequence:** "the benchmark is the source of truth" (`AGENTS.md`) currently points at a compliance meter, so tuning against it risks optimizing the wrong thing.

### 2.5 High — intent is substring matching

`has()` is `text.includes(word)` (`types/intent-profile.ts:63`). Reproduced on Node 22 at this commit:

| Prompt | Classified as | Effect |
|---|---|---|
| "An approachable landing page for a neighborhood bakery" | `web-app-ui` | UI switches to multi-screen app-shell mode |
| "Landing page for an apparel brand" | `web-app-ui` | Same |
| "A happy, colorful site for a kids' summer camp" | `web-app-ui` | Same |
| "Website for a networking event for founders" | `portfolio` | Wrong grammar and avoid-rules |
| "Onboarding flow for an iOS habit tracker" | `marketing-site` | Mobile app intent missed |
| "Checkout screen for a mobile shopping app" | `commerce` / `marketing-site` | Mobile app intent missed |

During generation, each reference's role is inferred from its **URL string** (`annotation: url` in `lib/canvas/generate-design-core.ts:319` and `generate-screen-set-core.ts:193`). Weights are never passed, so `literalness` is always `loose-inspiration`.

### 2.6 High — the understanding bottleneck

The pipeline is pixels → 7 archetypes plus enums → prose directives → prompt. The model's perception is thrown away and replaced by bucket labels, which is the main ceiling on "it understood what I had in mind".

- **Marketing-only ontology.** The archetypes are marketing-site categories and partly benchmark-shaped: `culture-event` says "Think Vibecon" (`app/api/taste/extract/route.ts:70`). References of dashboards, mobile apps, native apps or games have no home and collapse to `premium-saas`, which is a landing-page archetype.
- **Landing-page composition vocabulary.** `navigationStyle` is `"top-bar" | "sticky" | "minimal" | "hidden"` (`types/composition-analysis.ts:53`). There is no sidebar, tab bar, toolbar or command palette.
- **False precision.** `mapTypeScale` (`lib/canvas/composition-blueprint.ts:180`) turns a 3-value enum into pixel sizes (dramatic becomes 88/48/18) that are then emitted as HARD directives.
- **Partial reference coverage.** Extraction sees 5 references, and generation sees the first 4 at `detail: "low"` (`generate-design-core.ts:361`).
- **Nothing is measured from pixels**: palette proportions, text sizes, spacing unit, grid and radii are all guessed.

### 2.7 High — the harness runs inside a React component

`PromptComposerV2.tsx` (1,347 lines) runs per-reference composition analysis, taste extraction, mode routing, generation and feedback in the browser, and its progress display is a timer (`:881`). As a result:
- Agents and benchmarks either reimplement steps or skip them (§2.1).
- Closing the tab kills a run, and nothing can be resumed.
- The server keeps no record of what was generated from which inputs.

### 2.8 High — collaboration model fights agents

- Concurrency is optimistic at the whole-document level. `generate-screen` loads the canvas, generates for tens of seconds, then saves with `expectedRevision: doc?.revision` (`route.ts:116`). Any designer save that lands in that window triggers `CANVAS_REVISION_CONFLICT`, and the paid generation is discarded with a 502. Editor saves are debounced 8 seconds (`lib/canvas/canvas-save-policy.ts:26`).
- In the editor, every agent write that auto-applies resets the designer's undo history (`APPLY_REMOTE_STATE`, `lib/canvas/canvas-reducer.ts:3254`). If a local save is pending, the editor instead blocks further saves and shows a reload toast (`lib/canvas/canvas-context.tsx:221`). Reloading replaces the local state, so unsaved local edits are lost.
- `select_on_canvas` is a silent no-op. `set_selection` changes only `selection`, which the persist hash excludes (`lib/canvas/canvas-content-hash.ts:28`). The server returns `unchanged` while the tool reports the operation as applied, and the proof only covers the operation level.
- Session state (selection, viewport, prompt history) is stored in the shared document.

### 2.9 High — the MCP layer isn't built for long, visual, typed work

- **Timeouts.** `maxDuration = 60` (`app/api/mcp/route.ts:11`), and tools call the app's own HTTP API. Base generation alone was measured at 20–35 seconds (`AGENTS.md` speed diagnostic). The refine loop (up to a 40-second budget), variants and sequential screen sets push past 60 seconds, and the downstream route may still write the artboard after the agent has already seen a timeout. **Fixing §2.1 makes this worse** (taste turns the refine loop and variants on) unless long-running jobs land in the same release.
- **Untyped, image-less results.** Results are pretty-printed JSON text (`lib/agent/mcp-tool-registry.ts:19`). There are no output schemas, no `structuredContent` and no image content, so the agent can't *see* the design it is implementing. `write_canvas.operations` is `record<string, unknown>`.
- **Missing protocol features.** No long-running tasks, no MCP Apps UI, and no OAuth. `sos_live_` tokens have no scopes or expiry.
- **Wrong workflow in the skill.** The shipped skill (`extensions/cursor/skills/studio-canvas/SKILL.md`) teaches canvas CRUD, not the coding agent's real loop: read the approved state → implement → screenshot → review → fix.

### 2.10 Medium — app-UI fidelity ceiling

- The prompt frame stays landing-page even under app grammars: "composing a landing page" (`lib/canvas/design-tree-prompt.ts:591`) and "Choose 4-7 sections" (`:801`), plus hero-height and pacing rules.
- `gridTemplate` is limited to 8 patterns (`:800`), but data tables need arbitrary tracks.
- The node model lacks:
  - icons;
  - `sticky`/`fixed` positioning;
  - `space-around` and `space-evenly` (the mobile few-shot's tab bar uses `space-around` anyway);
  - text truncation and line clamp;
  - any breakpoint beyond two.
- The design-knob vector has no app dimensions: information density, chrome weight, control size, table density, navigation model.

### 2.11 Medium — cost and latency architecture

- There is no streaming anywhere.
- There is no prompt caching. The large static prompt (schema, grammar, few-shot) is re-sent on every base, retry, refine, variant and screen call.
- Screens are generated sequentially.
- There is no per-run token or cost accounting; `providerUsage` records request counts and coarse cost units, not tokens.
- The generation model is pinned, and there is no eval harness for choosing a different one.

---

## 3. Root causes

| Root cause | Explains |
|---|---|
| **R1. The harness runs in the browser and its memory lives in localStorage.** | §2.1, §2.7, audit #2 |
| **R2. Understanding is compressed into a closed, marketing-shaped vocabulary.** | §2.5, §2.6, audit #1, #4 |
| **R3. Each canvas is one mutable blob with one revision counter.** | §2.2, §2.8, and audit #5/#6: there is nothing stable to bind a design revision to |
| **R4. Evaluation shares the generator's assumptions.** | §2.3, §2.4, audit #5, #8 |
| **R5. The IR is visual-only**: no semantics, tokens, states, icons or components-as-code. | §2.10, audit #4, #7 |
| **R6. Agent integration is canvas-centric**: agents edit Studio OS, but Studio OS doesn't help agents ship. | §2.9, audit #6 |

---

## 4. Target architecture

### 4.1 Principles

- **Additive over rewrite.** The V6 renderer, canvas UI, Convex and MCP stay. New layers wrap them in the strangler pattern, and each ships behind a proof gate.
- **The server is the harness.** The browser is a client, just like agents.
- **Measure, perceive, then ask.** Never guess silently, and show the interpretation before spending generation.
- **Separate generator from evaluator.** Calibrate evaluators on the designer's own judgments.
- **Everything has provenance**: which reference, which preference, which revision, which commit.
- **Models are swappable per step**, and evals choose them.

### 4.2 System map

```
        Designer (canvas UI)                    Coding agents (Claude Code, Codex, Cursor, …)
               │                                  │  MCP tools + Tasks + Apps  ·  Agent Skill
               ▼                                  ▼
  ┌───────────────────────── Studio OS API — server-side harness ──────────────────────────┐
  │  Intent Engine ──► Generation Engine ──► Verification Engine ──► Change & Evidence      │
  │  measure · perceive   durable jobs ·        pixel-true render ·     approved revisions ·  │
  │  assign · clarify     streaming · shells    independent judges      review · handoff       │
  └──────────▲──────────────────────▲─────────────────────────▲─────────────────────────────┘
             │                      │                         │
     Design Memory (Convex)   Design IR v7 = V6 + semantics   Project Adapter (in the user's repo)
     assets · analyses ·      tokens (DTCG) · roles · icons    routes · components · tokens ·
     briefs · taste layers ·  states · components · slots      fixtures · screenshots · source map
     preferences · runs ·
     revisions · evidence
```

### 4.3 Design Memory (server-side, in Convex)

| Table | Holds | Why |
|---|---|---|
| `assets` | File-storage id, content hash, dimensions, source | Uploads leave the canvas document; stable identity for caching |
| `referenceAnalyses` | assetId, analyzerVersion, `measured` (palette with area %, text-size clusters, spacing and grid estimates, radii), `perceived` (open-vocabulary qualities with evidence regions), confidence | Replaces enum buckets with evidence |
| `designBriefs` | Versioned per request: goal, output type (model-classified, with confidence), audience, per-reference and per-region role assignments, constraints, conflicts and resolutions, open questions | The "what I understood" object that UI, generation, evals and agents all read |
| `tasteLayers` | `derived` (recomputable; cache key = hash of assets, roles, weights, analyzer version), `explicit` (user-set), `learned` | Refreshing derived taste can no longer wipe learning (fixes the stale-vs-wipe dilemma) |
| `preferences` | Rule, dimension, value, **scope** (`node`, `screen`, `project`, `user`), evidence (edit ids, counts), confidence, status (`proposed`, `accepted`, `rejected`), origin (`human-edit`, `agent-edit`, `inferred`) | Scoped, inspectable, undoable learning (audit #2) |
| `tokenSets` | DTCG 2025.10 JSON, semantic tokens referencing primitives, modes (light/dark) | Portable to Figma variables, Tailwind v4 `@theme`, Style Dictionary |
| `generationRuns` | Brief id, input hash, per-step model and prompt versions, cost, latency, status (`queued`, `running`, `partial`, `complete`, `failed`), checkpoints, outputs, scores | Durable, resumable runs; provenance; eval and learning data |
| `designRevisions` | Immutable approved snapshot of one screen-state: tree, tokens, fixture, viewport, render hash | What implementation is reviewed against, with stale detection |
| `evidence` | Implementation screenshots per state and viewport, commit SHA, fixture, tests, review result, `designRevisionId` | Traceable design ↔ code proof |

### 4.4 Intent Engine: show what it understood, then generate

1. **Measure** (deterministic, cheap, explainable):
   - palette quantization in a perceptual color space, with area proportions and role guesses;
   - text detection → font-size clusters → type-scale ratio;
   - margin and gutter analysis → grid and spacing unit;
   - radius and stroke sampling on UI screenshots.

   These real numbers replace the enum-to-pixel mapping.
2. **Perceive** (model, open vocabulary): per reference, what makes it distinctive, with bounding boxes. App-UI vocabulary (navigation model, density, data display, control style, iconography) sits alongside the editorial vocabulary. Archetypes become a retrieval hint, not the ontology.
3. **Assign** (designer in the loop): infer and show per-reference roles, e.g. "layout from A, type from B, ignore B's color". Region assignment is done by lassoing part of a reference. Every model call labels each image with its identity and role, which fixes audit #1.
4. **Clarify** (only on conflict): detect contradictions such as dark vs light, serif vs grotesk, or dense vs airy, and ask at most 3 structured questions.
5. **Classify intent with a model and a schema** (confidence plus alternatives). Keep word-boundary heuristics only as an offline fallback.

Output: a `DesignBrief`, consumed identically by the UI, generation, evaluation and agents.

### 4.5 Generation Engine

- **Durable server-side jobs** (Convex actions plus scheduler, or a workflow engine) with checkpoints: brief → plan → shell and components → screen-states → verify → repair. Only failed steps are resumed, and every run reports complete, partial or failed with missing IDs (audit #3).
- **Streaming.** Each section or screen is written to Convex as it finishes, so the canvas renders progressively. Real events replace timer-driven `agentSteps`.
- **Consistency by construction.** Shells and repeated UI are generated once as component masters, and screens instantiate them with slots.
- **Structured outputs** via schema-constrained tool calls, instead of regex JSON extraction plus truncation repair.
- **Prompt caching** of the static prefix (schema, grammar, few-shot, brief) across base, retry, refine, variant and screen calls.
- **Per-step model routing chosen by evals.** Re-baseline raw vs harnessed whenever models change.
- **Instances, not rectangles.** Generation emits instances of known components (the design system or the imported codebase inventory) with props, instead of redrawn frames.

### 4.6 Verification Engine

- **Pixel-true renderer service.** Uses the same renderer and font registry as the canvas (Google, Fontshare, uploaded, licensed), with one viewport per breakpoint and state. The visual loop, reviews, export previews and evals all share it.
- **Deterministic checks:**
  - WCAG contrast;
  - token adherence;
  - spacing-scale adherence;
  - overflow, clipping and truncation;
  - touch-target size;
  - grid alignment;
  - heading order;
  - alt text.
- **Independent judges:**
  - a different model family from the generator where possible;
  - **pairwise** comparisons ("which is closer to reference A's layout intent?") instead of absolute scores;
  - region-level issues with bounding boxes and repair instructions;
  - calibration against a labeled set of the designer's own judgments;
  - reported uncertainty.
- **Behavior checks for implemented code**: Playwright per state and fixture, which is the interaction-based review from Anthropic's harness article.

### 4.7 Design IR v7 = V6 + a semantic layer (additive, all optional)

```ts
type DesignNodeV7 = DesignNode & {
  role?: "nav" | "navItem" | "heading" | "paragraph" | "list" | "listItem" | "table" | "row" | "cell"
       | "form" | "field" | "input" | "select" | "checkbox" | "switch" | "tabs" | "tab" | "dialog"
       | "sheet" | "toast" | "badge" | "avatar" | "icon" | "chart" | "media";
  a11y?: { label?: string; level?: 1 | 2 | 3 | 4 | 5 | 6; describedBy?: string };
  tokens?: Partial<Record<keyof DesignNodeStyle, string>>; // "color.surface.raised", resolved at render
  icon?: { set: "lucide" | string; name: string };          // rendered and exported
  component?: { ref: string; props?: Record<string, unknown>; slots?: Record<string, string[]> };
  code?: { symbol: string; file?: string; sourceId?: string }; // bound code component / data-sos-id
  states?: Record<string, Partial<DesignNodeStyle>>;          // hover, pressed, focus, disabled, loading
  repeat?: { source: string; template: string };              // fixture-driven lists and tables
};
```

Layout additions:
- `position: sticky | fixed` and `alignSelf`;
- the full set of `justifyContent` values and arbitrary grid tracks;
- truncation and line clamp;
- custom breakpoints (tablet plus container-relative).

**Storage form:** a flat node map (`id → { parentId, order: fractionalIndex, ...fields }`). Nesting depth stays constant however deep the tree gets, and per-node operations become possible (§4.9).

### 4.8 App Model: a screen-state graph

```ts
type AppModel = {
  platform: "web" | "ios" | "android" | "desktop" | "react-native";
  surfaces: Array<{ id: string; route?: string; nativeScreen?: string; shellRef?: string }>;
  states: Array<{
    id: string; surfaceId: string; name: string; fixtureId?: string; role?: string;
    viewports: string[]; overlays?: string[]; designRevisionId?: string;
  }>;
  transitions: Array<{ from: string; event: string; to: string; guard?: string }>;
  fixtures: Array<{ id: string; data: unknown }>; // empty, populated, error, permission, …
  acceptance: Array<{ stateId: string; checks: string[] }>;
};
```

- **Canvas views:** a Flow view (surfaces as columns, states as rows) and a Coverage matrix showing designed, implemented, verified and missing for each viewport.
- **Scoped editing:** every edit targets this state, all states of this surface, or the component everywhere. The default is visible and reversible.
- **"Generate missing states"** uses fixtures plus the shared shell and components.

### 4.9 Collaboration and storage

- **Normalize storage:**
  - `canvasItems` as rows;
  - each artboard tree as a flat node map (its own document, or chunked);
  - assets in file storage;
  - presence, selection and viewport in an ephemeral presence table with TTL, which never bumps the document revision.
- **Operations:** `applyOps(projectId, baseRevision, ops[])` with property-level last-writer-wins on node fields, structural operations using fractional indices, and server validation. Long agent writes rebase instead of failing. [Figma's server-authoritative property-LWW model](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) is the reference; it is simpler than a CRDT for tree-of-objects documents.
- **Undo** inverts only the user's own operations, so it survives remote writes.
- **Revisions** are kept per artboard and state (`designRevisions`) instead of as whole-canvas snapshots.

### 4.10 Design ↔ Code bridge (the agent-era core)

**A. Code → Studio OS: understand the real app.** A small connector runs in the user's repo (`npx studio-os connect`, also exposed as a local MCP server). It:
- detects the stack;
- inventories routes and surfaces, components (props from TS types or Storybook), tokens (Tailwind v4 `@theme`, CSS variables, DTCG files) and fonts;
- captures screenshots per route, state and viewport with Playwright, using fixtures or Storybook stories;
- instruments dev builds with `data-sos-id` (Babel/SWC plugin) to map DOM nodes to source files and components, the pattern [Onlook](https://github.com/onlook-dev/onlook) uses with `data-oid`;
- uploads an `AppSnapshot`. Studio OS imports components as masters bound to code symbols, tokens as a token set, and screens as editable "current state" artboards (DOM → DesignNode).

**B. Studio OS → Code: ship a design change.** A `DesignChange` contains:
- scope: a surface, state or component;
- base and target `designRevisionId`s;
- a semantic diff: token changes, prop changes, layout deltas, new states;
- **preservation rules**, e.g. "keep payment logic and the component API; no new dependencies";
- acceptance checks: visual per state and viewport, accessibility, behavior.

The loop then runs:
1. The coding agent applies a source patch (it owns the repo), runs the app, and returns `evidence`: screenshots per state, tests and a commit SHA.
2. Studio OS verifies against the approved revision (pixels, intent and behavior).
3. Studio OS returns region-level issues or approval, and flags stale revisions.

**Protocol surface** (per the MCP 2026-07-28 spec):
- **Typed results.** Tool results carry JSON Schema output and `structuredContent`, include image blocks for renders, and use explicit handles (`briefId`, `designRevisionId`, `changeId`, `runId`) instead of hidden session state.
- **Tasks** for generation, screen sets and reviews, with progress and cancellation.
- **MCP Apps.** A `ui://` compare/review panel and a coverage view that render inside Claude, ChatGPT and VS Code.
- **Auth.** OAuth 2.1 for one-click connectors; scoped, expiring tokens (`read`, `write`, `generate`, `review`).
- **Skills.** An `implement-design-change` Agent Skill for Claude Code, Codex and Cursor, kept separate from the canvas-editing skill.
- **Optional repo mirror.** A `.studio/` folder (DTCG tokens, screen-state specs, approved revisions) committed alongside the code, giving git-reviewable design diffs and offline agent access. pen.dev's in-repo `.pen` files show the demand. Convex stays the live store, and the mirror is a lockfile that binds design revision to commit.
- **ACP only if Studio OS hosts coding agents itself**, as the audit says.

### 4.11 Platform adapters

- Separate platform-neutral intent (App Model plus IR v7 semantics) from renderers and code adapters.
- Add constraint packs per platform: HIG and Material touch targets, navigation patterns, type ramps and safe areas. Generation and verification both use them.
- Order: React web on existing apps → React Native/Expo as the one non-web proof (renderer, constraint pack, code adapter, verification) → other platforms only after their own gates.

### 4.12 Evaluation and learning program

- **Held-out suite** covering editorial, SaaS marketing, dense analytics, CRUD/forms, commerce/checkout, mobile app, desktop app, conflicting references, existing-app edits and adverse states.
- **Ground truth is blind pairwise human preference.** LLM judges are calibrated against it and monitored for drift.
- **Separate metrics:**
  - reference-intent adherence;
  - craft;
  - state coverage;
  - behavior preservation;
  - accessibility failures;
  - corrections needed before approval;
  - time to first render;
  - cost per approved screen.
- **Re-baseline** raw vs harnessed on current frontier models, and keep the failures.
- **Online signals** from `generationRuns` (variant picks, reverts, accepted preferences) feed both evals and preference memory.

---

## 5. The "feels like AGI" surfaces

These stay inside the Studio OS design system: `#4B57DB` as the only accent, mono kickers, 4–6px radii, and no decorative gradients.

| Surface | What it does | Design rationale | Accessibility |
|---|---|---|---|
| **Intent Card** (pre-generation) | "What I understood": per-reference role chips (Layout / Type / Color / Mood / Ignore), measured swatches with %, detected type ratio, a one-line key move per reference, conflicts as one question | An inspectable interpretation turns "AI guessed" into "AI understood" | Role chips are toggle buttons with `aria-pressed`; swatches show hex and a text label, not color alone |
| **Reference Lens** | Hovering shows the regions the engine used; lasso assigns a role to a region | Low-chrome inline overlay (Linear-like) keeps attention on the reference | Keyboard region cycling; focus ring `#D1E4FC` |
| **Intent Sliders** | Exposes 6–8 axes of the existing `DesignKnobVector` (`lib/canvas/design-knobs.ts`), such as density, whitespace drama, asymmetry, scale contrast, accent restraint and chrome, with live preview on the selected section | The continuous taste space already exists but users can't reach it; a cheap, high-impact win | Native range inputs with value text |
| **Taste Memory** | Learned preferences as sentences with scope, evidence, accept/reject; e.g. "Prefer text-link CTAs in editorial projects — from 3 edits" | Users trust learning they can see and undo | List semantics; undo is announced |
| **Live Build** | Sections and screens stream in with the plan visible; stop or steer mid-run | Progress you can watch reads as competence; fake timers read as waiting | `aria-live="polite"` step updates |
| **Verification Strip** | Compact checks (contrast, token drift, states covered, pairwise wins) with one-click fixes | Proves quality instead of asserting it | Each check is a button with a status text |
| **Coverage Matrix** | Surfaces × states × viewports: designed / implemented / verified / missing | Makes "any state of the app" concrete and navigable | Real `<table>` with header scopes |
| **Implementation Diff** | Approved design vs implemented screenshot (swipe or onion-skin), pinned region issues, "send fix to agent" | Closes the loop where designers already look | Pinned issues are also listed as text |

---

## 6. Roadmap with proof gates

Sizes are S, M and L. No calendar estimates without team capacity and cost data.

### Phase 0 — Trust fixes (S–M, mostly independent)

| Task | Gate |
|---|---|
| **0.1 Fonts in render and export.** Collect `fontFamily` values from trees and load them from a font registry (fix `Geist`, add Fontshare). Await `document.fonts`, and render at artboard width. | A tree using a serif display font renders it (`document.fonts.check`) in both the screenshot and the exported HTML |
| **0.2 Intent routing.** Model classification with a schema and confidence; word-boundary fallback; pass real reference ids, weights and annotations. | The six prompts in §2.5 classify correctly |
| **0.3 Taste signature and overrides.** Include prompt, weights and image identity/roles in the signature; label each image; refresh merges `userOverrides` instead of dropping them; persist edit baselines. | Audit proofs #1 and #2 |
| **0.4 Server-side design state (minimal).** A Convex `projectDesignState { tasteProfile, tokens, updatedAt }`, written by the editor and read by every `/api/agent/*` route; `get_canvas` returns it. | MCP `generate_screen` runs with taste, and debug shows `visualRefineAttempted: true`. Ship together with 0.5 and a Tasks/async path, or the 60 s cap bites (§2.9) |
| **0.5 Agent write path.** On conflict, reload and reapply the operations (`add_artboard` commutes); make `select_on_canvas` presence-only or report "not persisted". | A generation survives a concurrent designer edit |
| **0.6 Persistence ceiling.** Proof script against a dev deployment (deep tree plus large reference); move uploads to file storage. | If the limit is confirmed, pull Phase 3 forward |
| **0.7 Hygiene.** Fix the lint error; make `proof:visual-loop-v2` pass without a key (both from the audit). | `npm run verify` is green |

### Phase 1 — Server-side harness, Design Memory, Intent v1 (L)

- Move orchestration out of `PromptComposerV2` into a server pipeline used by the UI, MCP and benchmarks, with durable `generationRuns`.
- Add the §4.3 tables, taste layers with provenance and scope, the Intent Card with per-reference roles, and measured palette, type and spacing.
- **Gate (the audit's proofs):**
  - identical images with opposite roles produce different constraints;
  - muting a reference removes its influence;
  - changing the brief invalidates extraction;
  - a confirmed palette or structural correction survives reload and applies to the next relevant generation only.

### Phase 2 — Evaluation you can trust (M–L; parallel with Phase 1)

- Build the renderer service (from 0.1), the deterministic checks and an independent pairwise judge.
- Create a human-labeled calibration set and held-out suite v1 covering at least 6 categories.
- Re-baseline raw vs harnessed on current models, and retire the text-summary benchmark scorer.
- **Gate:**
  - judge–human pairwise agreement meets an agreed threshold on the calibration set;
  - the report shows per-category deltas with confidence intervals.

### Phase 3 — Storage and sync normalization (L; earlier if 0.6 confirms the limit)

- Flat node maps, per-item rows, an operations API with rebase, a presence channel, per-state revisions, and undo of own operations.
- **Gate:**
  - an agent and a human can edit different nodes of the same artboard concurrently without loss;
  - trees at least 12 node levels deep persist;
  - undo survives remote writes.

### Phase 4 — IR v7 and the App Model (L)

- Roles, icons, token references, components with variants and states, data slots, and the layout additions.
- A screen-state graph with fixtures, the Coverage Matrix and scoped edits.
- Screen sets rebuilt on shells-as-components plus durable jobs with explicit completeness.
- **Gate:**
  - Billing is reproduced in loading, empty, populated, validation-error, permission-denied and success states;
  - transitions are correct;
  - an edit can deliberately target one state or all states;
  - export uses semantic HTML and icons.

### Phase 5 — Design ↔ Code loop on an existing React app (L)

- The connector with `AppSnapshot` import, `data-sos-id` source mapping, the `DesignChange` contract, and evidence review against approved revisions.
- MCP upgrades: Tasks, structured output, images, OAuth with scoped tokens, the MCP App review panel, and the `implement-design-change` skill.
- **Gate (the audit's demo):** "Connect my app. Nav density from A, type from B. Redesign Billing, including empty invoices, payment failure, upgrade modal and mobile. Keep payment logic and our component library."
  - Every change traces to a source diff and runtime proof.
  - An implementation with the right colors but a missing approved control fails review.
  - Reviewing an old revision is flagged as stale.

### Phase 6 — Second platform and scale (L)

- A React Native/Expo adapter with its constraint pack.
- A learning loop fed by online signals.
- Broader adapters only after each passes its own gate.

### Stop / don't build now

- Another renderer rewrite.
- More archetype grammars or prompt tuning before Phase 2 exists, because it would register as progress on a compliance meter.
- An agent marketplace.
- ACP hosting.
- Promising Flutter, SwiftUI or games before an adapter proof.

---

## 7. Plain-language version

- **Today** Studio OS is like a talented designer who:
  - condenses your references onto a sticky note of about 7 checkboxes;
  - keeps that note in *your* browser only;
  - hands every job to an assistant who reads only the note.

  Agents calling in from outside never see the note. The designer then checks their own work with their glasses off (wrong fonts) and grades it against the same sticky note, which is why the score looks great.
- **The fix, in one line:** give Studio OS a real memory on the server, show you what it understood before designing, have someone *else* check the real pixels, and let coding agents use the same memory and prove that what they built matches what you approved.
- **For apps:** design in **states** (empty, loading, error, success) rather than only pages; use your app's real components and tokens; and tie every design change to the code change that implemented it.

## 8. Best long-term solution

Make Studio OS a **model-agnostic design brain with memory, grounding and verification**, native to agent protocols (MCP Tasks, Apps and OAuth).

- **The canonical artifact** is a versioned **App Model**: a screen-state graph plus the semantic IR plus DTCG tokens, bound to code through source maps.
- **Every generation and every implementation** is judged against an approved revision by an independent evaluator calibrated to the designer.

Quality then compounds with each project, through learned and scoped preferences, and with each model upgrade, because the generator is swappable. Prompt scaffolding stops being the ceiling. That position is defensible against pure generators such as Stitch, v0 or Claude Design, and against canvas incumbents such as Figma, because none of them owns *your* taste memory together with verified design ↔ code state coverage.

---

## Appendix A — Reproductions

**Intent classifier (§2.5).** Copy `types/intent-profile.ts` next to a script that imports `extractIntentProfile`, then run it with `node --experimental-strip-types` (Node 22) over the six prompts in the table.

**Nesting depth (§2.2).** Parse the single-line app-dashboard example in `lib/canvas/design-tree-prompt.ts` (the line starting `[{"id":"app-root"`, with `${PRIM.*}` replaced by a hex value) and wrap it as `{ schemaVersion, items: [{ kind: "artboard", pageTree }] }`. Count container depth (each object or array counts as one level): 15. Add table › row › cell › text under Stats: 20.

**Font URL (§2.3):**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://fonts.googleapis.com/css2?family=Geist+Sans:wght@400;500;600;700&display=swap"  # 400
curl -s -o /dev/null -w "%{http_code}\n" "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"       # 200
```

## Appendix B — External references (checked 2026-09-22)

- MCP 2026-07-28 release candidate (stateless core, Tasks extension, MCP Apps, auth hardening): https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/
- MCP Apps specification: https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx
- MCP Tasks (2025-11-25): https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks
- Figma MCP, write to canvas / `use_figma`: https://developers.figma.com/docs/figma-mcp-server/write-to-canvas and https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/
- pen.dev (formerly Pencil), in-repo design files with bi-directional MCP: https://www.pen.dev/
- Cursor Design Mode: https://cursor.com/docs/agent/design-mode
- Google Stitch MCP: https://github.com/davideast/stitch-mcp
- Onlook (`data-oid` source mapping): https://github.com/onlook-dev/onlook
- Anthropic, harness design for long-running apps: https://www.anthropic.com/engineering/harness-design-long-running-apps
- Anthropic, Claude Design announcement: https://www.anthropic.com/news/claude-design-anthropic-labs
- Design Tokens (DTCG) 2025.10 stable: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- Convex data types and limits: https://docs.convex.dev/database/types
- AG-UI protocol (only if Studio OS later streams agent UI to third-party frontends): https://docs.ag-ui.com/introduction
