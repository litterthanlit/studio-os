# Phase 4 Handoff — Convex Canvas as Source of Truth (AGI Design Master Plan)

**From:** Phases 1–3 implementation sessions  
**To:** Next implementer / COO agent  
**Date:** 2026-07-11  
**Branch:** `main` @ `8bf4b01`  
**Canonical plan:** `docs/superpowers/plans/AGI Design + App-UI + Agent Platform — Master Execution Plan.md`

---

## Strategic context (one paragraph)

Phases 1–3 closed the harness quality loop (visual refine v2, multi-ref fusion, section-regen API). **Phase 4 is the platform prerequisite:** wire the editor to Convex so the canvas is server-readable/writable. Without this, Phase 5 agent tools (`get_canvas`, `generate_screen`, external writes) cannot land on a real project. The backend already exists; this phase is **client wiring + reconciliation**, not schema work.

---

## Phases 1–3 — SHIPPED (baseline for Phase 4)

| Phase | Commit(s) | Summary |
|-------|-----------|---------|
| 1 Visual loop v2 | `14612af` | See-critique-fix loop, variant visual scoring, `proof:visual-loop-v2` |
| 2 Multi-ref fusion | `160ca5c`, `8bf4b01` | Fused blueprint + secondary influences; numeric `spacingSystem`/`typeScale` → HARD directives; `proof:multi-ref-fusion` |
| 3 Section regen | `d7ff165` | `mode: "single"` + `useDesignNode` returns `{ variants: [{ pageTree }] }`; `proof:section-regen` |

**Do not re-audit or re-implement Phases 1–3.**

---

## Phase 4 — NOT STARTED (schema-only backend, localStorage editor)

### Goal

The canvas becomes server-readable/writable. `localStorage` remains the offline/draft cache; Convex is source of truth for authenticated users.

### What already exists (do NOT rebuild)

| Asset | Location | Notes |
|-------|----------|-------|
| `loadCanvas` query | `convex/projects.ts:77-86` | Returns `canvasDocuments` row for `projectId` (Convex `Id<"projects">`) |
| `saveCanvas` mutation | `convex/projects.ts:88-152` | Revision bump, `CANVAS_REVISION_CONFLICT` on mismatch, writes `canvasSnapshots` |
| `getBySlug` / `upsertBySlug` | `convex/projects.ts:18-75` | Project metadata; slug = local project id |
| Schema | `convex/schema.ts:78-105` | `canvasDocuments` (revision, state, lastSavedAt) + `canvasSnapshots` |
| Editor persistence | `lib/canvas/canvas-context.tsx` | 500ms debounced save → `saveUnifiedCanvas()` only |
| localStorage key | `lib/canvas/unified-canvas-state.ts:763` | `studio-os:canvas-v3:{projectId}` |
| Convex provider | `app/convex-provider.tsx` | Plain `ConvexProvider` — **no Convex Auth wrapper yet** |
| Project create | `components/new-project-modal.tsx:198-227` | localStorage first, `upsertBySlug` in background — **does not store returned Convex `_id`** |

### Critical ID mismatch (must solve in 4.1)

| Layer | ID type | Example |
|-------|---------|---------|
| Editor / URL / localStorage | **slug string** | `my-editorial-site` from `uniqueProjectSlug()` |
| Convex `loadCanvas` / `saveCanvas` | **`Id<"projects">`** | Convex document id |

**Recommended fix:** When `upsertBySlug` succeeds, persist `convexProjectId` on `StoredProject` (extend `lib/project-store.ts`). On canvas mount, resolve slug → Convex id via stored field or `api.projects.getBySlug`. Do **not** pass slug strings to `loadCanvas`/`saveCanvas`.

### What is NOT in `UnifiedCanvasState` (scope boundary)

`tasteProfile`, `designTokens`, `fidelityMode`, and `agentHarness` live in **`studio-os:project-state:{projectId}`** via `lib/project-store.ts`, not in `studio-os:canvas-v3:*`.

Phase 4 scope = **`UnifiedCanvasState` in `canvasDocuments.state`**. Bundling taste/tokens into Convex is optional follow-up (Phase 5 `get_canvas` will want them — document decision in implementation, don't block 4.1–4.3 on it unless trivial).

---

## Tasks (from master plan)

### Task 4.1 — Editor read path

**Files:** `lib/canvas/canvas-context.tsx`, `lib/canvas/unified-canvas-state.ts` (sync metadata helpers), possibly `lib/project-store.ts` (convex id), `components/new-project-modal.tsx` (store convex id on create)

**Behavior:**
1. On `CanvasProvider` mount, if user is authenticated **and** `convexProjectId` resolves:
   - `useQuery(api.projects.loadCanvas, { projectId })`
   - Load local: `loadUnifiedCanvas(slug)`
   - **Reconcile:** newest wins by `canvasDocuments.updatedAt` / `lastSavedAt` vs local sync metadata
   - Dispatch winning state via `LOAD_STATE`
2. If unauthenticated or `STUDIO_OS_DEV_AUTH_BYPASS` / no Convex auth: **unchanged** localStorage-only path
3. **Do not regress** synchronous hydration gate (`loadedItemCountRef`, `loadedForProjectRef`) — StrictMode unmount race was fixed by removing RAF; see AGENTS.md "Canvas Persistence Fix"

**Suggested local sync metadata** (new helper, not in reducer state):

```ts
// studio-os:canvas-v3-sync:{slug}
{ revision: number; savedAt: number; source: "local" | "remote" }
```

**Commit:** `feat(canvas): load canvas from Convex with localStorage reconciliation`

---

### Task 4.2 — Editor write path

**File:** `lib/canvas/canvas-context.tsx` (primary)

**Behavior:**
1. Keep existing 500ms debounce → `saveUnifiedCanvas(slug)` **synchronously** (unchanged)
2. **Additionally** enqueue Convex `saveCanvas` throttled ~3–5s (separate timer from local save)
3. Pass `expectedRevision` from last known remote revision; on `CANVAS_REVISION_CONFLICT`:
   - Refetch `loadCanvas` once
   - Last-write-wins with `console.warn` — no merge UI in v1
4. Fire-and-forget: never block canvas interaction; retry once on failure
5. Update local sync metadata revision after successful remote save

**Commit:** `feat(canvas): persist canvas to Convex on debounced save`

---

### Task 4.3 — Poll-based remote refresh (minimal)

**Files:** `lib/canvas/canvas-context.tsx`, small toast component (pattern: `app/canvas-v1/components/SizingModeToast.tsx` — fixed bottom, design-system hex)

**Behavior:**
1. On `window` `focus`, if authenticated + convex project id known:
   - Re-query `loadCanvas` revision (or compare cached revision vs remote)
   - If remote `revision` > editor's last-applied revision → show toast: **"Canvas updated externally — Reload"**
2. Reload action: refetch remote state, `dispatch({ type: "LOAD_STATE", state })`, reset local revision metadata
3. **No live merge** in v1 — toast + explicit reload only

**Commit:** `feat(canvas): detect external canvas updates on focus`

---

## Proof gate P4

### Manual (required)

| Check | Steps | Pass criteria |
|-------|-------|---------------|
| Cross-tab sync | Browser A: edit canvas → wait for Convex save → Browser B: reload same project | B shows A's edits |
| External write toast | Script or second client calls `saveCanvas` with higher revision | Focus editor tab → toast appears → Reload applies remote state |
| Dev bypass | `STUDIO_OS_DEV_AUTH_BYPASS=true`, no Convex auth | Full editor works on localStorage only; no errors from missing Convex calls |
| Hydration regression | Open sample/starter project, refresh twice quickly | Content persists; no empty canvas flash (StrictMode) |

### Scripted (optional but recommended)

Add `scripts/convex-canvas-sync-proof.ts` + `npm run proof:convex-canvas-sync`:
- Unit-test reconciliation helper (local vs remote timestamps/revisions)
- Mock conflict path: `expectedRevision` mismatch → refetch behavior
- Does **not** require live Convex if helpers are pure functions

---

## Blockers & dependencies (read before coding)

### 1. Convex Auth may not be production-wired

See `docs/security/post-convex-remediation-handoff.md` §1:
- Login may hard-error if auth provider not configured
- `convex/_generated/*` may be handwritten fallbacks until `npx convex dev` + real deployment
- Plain `ConvexProvider` without auth token → `loadCanvas`/`saveCanvas` throw `UNAUTHENTICATED`

**Phase 4 implementer must verify:**
```bash
# .env.local
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
```
```bash
npx convex dev   # real codegen, not fallbacks
```

If auth is not wired, Phase 4 can still land with:
- Convex path gated on `useConvexAuth` / identity present
- Dev-bypass and logged-out paths unchanged

Do **not** skip auth on `saveCanvas`/`loadCanvas` — they already call `canReadProject`/`canWriteProject`.

### 2. Slug ↔ Convex ID bridge

Without `convexProjectId` on `StoredProject`, authenticated saves will silently no-op or error. **Task 4.1 prerequisite:** store Convex id at project creation (and backfill on first open via `getBySlug` for existing projects).

### 3. `saveCanvas` state shape

`args.state` is `v.any()`. Serialize `UnifiedCanvasState` via existing `extractCanvasState()` / `saveUnifiedCanvas` stripping rules (no `compiledCode`, no transient prompt/generation fields). Reuse stripping logic — don't duplicate.

---

## Hotspot files — sequence carefully

| File | Risk |
|------|------|
| `lib/canvas/canvas-context.tsx` | **Primary hotspot** — hydration gate, debounced save, unmount flush; all Phase 4 tasks touch this |
| `lib/canvas/unified-canvas-state.ts` | Persistence helpers; add sync metadata here |
| `lib/project-store.ts` | `convexProjectId` on `StoredProject` |
| `convex/projects.ts` | **Avoid edits** unless return type needs extending (e.g. expose `revision` in load response — already on document) |

**Do not parallelize** edits to `canvas-context.tsx` with Phase 5 route work.

---

## Execution rules

1. Read `CLAUDE.md` + master plan Phase 4 — do not re-audit Phases 1–3.
2. One phase per branch/PR; **three commits** matching tasks 4.1 / 4.2 / 4.3 (or one commit if trivially small — prefer three for bisect).
3. Proof gate P4 is **manual-first** — do not mark complete on build-pass alone.
4. Update `AGENTS.md` "Current project state" after ship.
5. Run regression proofs after each task:
   ```bash
   npm run proof:multi-ref-fusion
   npm run proof:section-regen
   npm run proof:visual-loop-v2
   npm run security:regression
   ```

---

## Suggested implementation sketch

```tsx
// canvas-context.tsx (pseudocode — not copy-paste)

const convexProjectId = useConvexProjectId(projectSlug); // resolve from StoredProject or getBySlug
const remoteDoc = useQuery(
  api.projects.loadCanvas,
  convexProjectId && isAuthenticated ? { projectId: convexProjectId } : "skip"
);

// Mount: reconcile local vs remote → LOAD_STATE
// On reducerState change: saveUnifiedCanvas (500ms) + scheduleConvexSave (3-5s throttle)
// On focus: if remoteDoc.revision > appliedRevision → show reload toast
```

Extract pure functions to `lib/canvas/canvas-convex-sync.ts` for testability:
- `reconcileCanvasSources(local, remote, localMeta)`
- `stripCanvasForPersistence(state)` — shared with localStorage save
- `shouldPromptExternalReload(appliedRevision, remoteRevision)`

---

## Verified gaps still open (post Phase 4)

| Area | Status | Next phase |
|------|--------|------------|
| Convex canvas wiring | **THIS PHASE** | 4 |
| Agent auth + MCP project scope | PARTIAL | 5 |
| App-UI grammars | WEAK | 6 |
| DesignNode → TSX export | MISSING | 7 |
| tasteProfile/tokens in Convex | localStorage only | 5 (`get_canvas`) |

---

## First actions for next agent

1. Read master plan Phase 4 + this handoff — do not re-audit Phases 1–3.
2. Confirm Convex deployment + auth: `npx convex dev`, log in, verify `api.projects.listMine` works in dashboard.
3. **Spike:** resolve slug → `Id<"projects">` via `getBySlug`; store `convexProjectId` on project create.
4. Implement **4.1** (read + reconcile) behind auth gate; verify sample project still loads offline.
5. Implement **4.2** (throttled save); verify revision increments in Convex dashboard.
6. Implement **4.3** (focus toast); run P4 manual checklist.
7. Update `AGENTS.md`; push to `main`.

---

## Deferred (explicitly out of scope for Phase 4)

- Real-time collaborative editing / live merge
- Conflict resolution UI
- Migrating `tasteProfile` / `designTokens` to Convex (unless needed for 4.2 smoke test)
- Phase 5 agent routes, MCP tools, generation core extraction
- Convex auth remediation full pass (see security handoff) — only what Phase 4 requires to call `loadCanvas`/`saveCanvas`

---

## Reference docs

| Doc | Why |
|-----|-----|
| `docs/security/post-convex-remediation-handoff.md` | Convex auth wiring status |
| `docs/convex-migration-report.md` | Schema / function inventory |
| `AGENTS.md` | Canvas Persistence Fix history |
| `CLAUDE.md` | Data layer direction (Convex migrating, localStorage cache) |
