# Phase 1 Handoff — Visual Loop v2 (AGI Design Master Plan)

**From:** Phase 1 implementation session  
**To:** Next implementer / COO agent  
**Date:** 2026-07-09  
**Branch:** `main` @ `14612af`  
**Canonical plan:** `docs/superpowers/plans/AGI Design + App-UI + Agent Platform — Master Execution Plan.md`

---

## Strategic context (one paragraph)

Studio OS is executing a 7-phase plan toward "AGI in design" + app-UI + agent-native canvas. Phase 1 was the highest-leverage "AGI feel" move: turn the visual refine loop from blind text retry into a genuine see-critique-fix loop. Phases 2–3 can run in parallel with each other; Phase 4 is prerequisite for Phase 5 (agent platform).

---

## Phase 1 — SHIPPED (`14612af`)

### What landed

| Task | Status | Summary |
|------|--------|---------|
| 1.1 Screenshot in refine regen | ✅ | `buildVisualRefineRegenerationContent()` sends refs at `low` detail + self-screenshot at `high` detail with critique instruction |
| 1.2 Bounded multi-iteration refine | ✅ | Up to `STUDIO_OS_VISUAL_REFINE_MAX_ITERATIONS` (default 2, cap 3); 40s latency cap; best-scoring tree wins; `visualRefineIterations` on `v6Debug` |
| 1.3 Derived variant scoring | ✅ | Pushed/restructured variants get score-only pass; catastrophic regression (>2.0 below base) triggers one re-derive; `variantVisualScores` on `v6Debug` |
| Proof gate P1 | ✅ | `npm run proof:visual-loop-v2` — mocked scores, no Chromium required |

### Key files

| File | Role |
|------|------|
| `lib/canvas/visual-refine-loop.ts` | v2 loop: `runVisualRefineLoop`, `buildVisualRefineRegenerationContent`, `guardDerivedVariantVisualScore` |
| `lib/canvas/design-node-screenshot.ts` | Puppeteer-core + `@sparticuz/chromium`; graceful skip via `STUDIO_OS_DISABLE_SCREENSHOT=true` |
| `app/api/canvas/generate-component/route.ts` | Wires refine after base taste gate (variants + `useDesignNode` only); variant visual guard after derivation |
| `scripts/visual-loop-v2-proof.ts` | P1 proof gate |

### Env / runtime notes

- `STUDIO_OS_VISUAL_REFINE_MAX_ITERATIONS` — default 2, hard cap 3
- `STUDIO_OS_DISABLE_SCREENSHOT=true` — skips screenshot capture; loop degrades gracefully (no refine, no variant scores)
- Live visual refine requires Chromium (`PUPPETEER_EXECUTABLE_PATH` or local Chrome). Without it, generation still works; visual loop is a no-op.
- Visual refine only runs when: `mode === "variants"`, `useDesignNode: true`, `tasteProfile` present, `referenceUrls.length > 0`, `OPENROUTER_API_KEY` set.

### What was NOT done (intentionally)

- Section regen API fix (Phase 3) — still broken for `mode: "single"` + `useDesignNode: true`
- Multi-ref fusion (Phase 2) — still single-primary composition
- Convex canvas wiring (Phase 4)
- Manual browser QA of live visual refine with Chromium — proof script covers logic; live pixel loop unverified in this session

---

## Verified gaps still open (from master plan audit)

| Area | Status | Next phase |
|------|--------|------------|
| Multi-ref fusion | MISSING | Phase 2 |
| Section regen API | BROKEN | Phase 3 |
| Convex canvas | SCHEMA-ONLY | Phase 4 |
| MCP / agent auth | PARTIAL | Phase 5 |
| App-UI grammars | WEAK | Phase 6 |
| DesignNode → TSX export | MISSING | Phase 7 |

---

## What the next agent should do

### Recommended sequence

```
If solo agent  → Phase 3 first (small bug, high user value, ~1 file hotspot)
If 2 agents    → Phase 2 + Phase 3 in parallel (different files)
Then           → Phase 4 → Phase 5 (agent platform needs Convex canvas)
Phase 6        → independent of 4/5; better after 1–3 for quality
Phase 7        → after Phase 6
```

### Phase 2 — Multi-reference fusion + taste fidelity (next quality lever)

**Goal:** "It understood my references" — plural.

| Task | File(s) | Commit message |
|------|---------|----------------|
| 2.1 Fused composition blueprint | `lib/canvas/composition-blueprint.ts` | `feat(taste): fuse secondary reference influences into composition blueprint` |
| 2.2 Numeric spacing/type-scale in TasteProfile | `types/taste-profile.ts`, `app/api/taste/extract/route.ts`, `lib/canvas/directive-compiler.ts` | `feat(taste): numeric spacing/type-scale fields flow from composition analysis to directives` |

**Proof gate P2:** Script with 3-ref fixture → 1 structure block + 2 influence blocks; numeric HARD directives when `typeScale` present.

### Phase 3 — Fix section-regen API (ship first if solo)

**Goal:** Right-click "Regenerate similar/different" returns DesignNode, not legacy TSX.

| Task | File | Commit message |
|------|------|----------------|
| 3.1 V6 single-tree path when `useDesignNode: true` | `app/api/canvas/generate-component/route.ts` (~1351–1407 non-variants branch) | `fix(generation): section regen returns DesignNode variants when useDesignNode is set` |

**Call sites already expect `{ variants: [{ pageTree }] }`:**
- `app/canvas-v1/components/PromptComposerV2.tsx:608-624`
- `app/canvas-v1/components/LayersPanelV3.tsx:874-891`

**Important:** NO visual refine loop on section regen (latency-sensitive per plan).

**Proof gate P3:** Manual right-click regen + fetch script asserting `variants[0].pageTree` exists.

---

## Hotspot files — NEVER parallelize edits

- `app/api/canvas/generate-component/route.ts`
- `lib/canvas/design-tree-prompt.ts`
- `lib/canvas/canvas-context.tsx`
- `lib/canvas/unified-canvas-state.ts`

Phase 3 touches `generate-component/route.ts`. If also doing Phase 2, do **not** edit that file in the same session as another agent.

---

## Execution rules (from master plan)

1. Read `CLAUDE.md` before canvas code (`PUSH_HISTORY` before mutation, `activeItemId`, `getNodeTree()`/`withUpdatedTree()`, design system hex rules).
2. One phase per branch/PR unless trivially small; commit per task with messages from the plan.
3. Every phase ends with its proof gate — do not mark complete on build-pass alone. Features need a user-facing path.
4. Model calls cost money: use mocked scorers in scripts; live-model proof only when `OPENROUTER_API_KEY` present.
5. Update `AGENTS.md` "Current project state" after each shipped phase.

---

## Verification commands

```bash
# Phase 1 regression
OPENROUTER_API_KEY=test npm run proof:visual-loop-v2
npm run proof:visual-loop-mcp

# Existing harness proofs (should stay green)
npm run proof:design-node-taste
npm run proof:agent-design-harness
npm run security:regression
```

---

## First actions for next agent

1. Read the master plan (`AGI Design + App-UI + Agent Platform — Master Execution Plan.md`) — do not re-audit Phase 1.
2. Run `proof:visual-loop-v2` to confirm baseline.
3. **If solo:** start Phase 3 (section-regen fix) — smallest scope, fixes silent user-facing bug.
4. **If parallel:** dispatch Phase 2 on `composition-blueprint.ts` + Phase 3 on `generate-component/route.ts` (different agents, different files).
5. After Phase 2+3: manual QA — generate with 3 references (check blueprint), right-click section regen (check DesignNode replacement).

---

## Deferred (explicitly out of scope)

Embeddings/RAG, tablet breakpoint, prototype hotspots, Figma import, multiplayer/live merge, import-from-codebase.
