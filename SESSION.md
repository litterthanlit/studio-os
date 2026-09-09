# SESSION.md — coding-agent continuity

Read this file first. Do not start from `extensions/cursor/`. That folder is the live MCP plugin for editing user canvases, not the architecture guide and not session memory.

This repo has no external project-memory service. Continuity for the next coding agent is **this file**, committed with the work.

## Last updated

2026-09-09 — debut track 3: live agent presence on the open canvas (authorship on `canvasDocuments`, undo does not clobber a newer agent revision).

## Resume point

Signed-in editor and agents still share one `canvasDocuments` row and `revision` counter. Agent writes stamp `lastWriter: "agent"`, `lastAgentAt`, and `lastAgentRevision`; the editor’s `loadCanvas` query shows “Agent updated canvas · rev N”. Human undo cannot persist over a newer remote revision (toast + reload; `APPLY_REMOTE_STATE` resets history). Code items from track 2 are unchanged. Proof: `npm run proof:agent-presence`, `npm run proof:convex-canvas-sync`, `npm run proof:code-on-canvas`. Do not rebuild Connect Cursor / Claude paste flows. Open docs PR #5 is unrelated; do not regress `extensions/cursor/`.

## Product

Studio OS is a **design harness**: references → taste extraction → HARD/SOFT/AVOID directives → V6 DesignNode JSON → infinite canvas. Benchmark: raw 5/10, harnessed 9/10, delta +4. Debut is already shipped.

## Invariants

- Debut is shipped — do not reopen or rebuild it
- Do not rebuild PageNode / V5
- Do not invent canvas / digest / attn surfaces
- Do not skip proof gates that already exist
- Convex is truth; localStorage is cache only

## Where to read (in order)

1. `SESSION.md` (this file) — resume, invariants, canonical paths
2. `CLAUDE.md` — commands, DesignNode, file map, design system
3. `AGENTS.md` — roles (CEO / COO / Creative Director / QA) after the resume is clear
4. `extensions/cursor/` — only when installing or debugging the live MCP plugin

## Architecture

Do not re-learn this from the plugin folder.

- **V6 DesignNode** (`frame | text | image | button | divider`): `lib/canvas/design-node.ts`
- **Canvas state + reducer:** `lib/canvas/unified-canvas-state.ts`, `lib/canvas/canvas-reducer.ts`
- **Renderer:** `app/canvas-v1/components/ComposeDocumentViewV6.tsx`
- **Convex canvas:** `convex/schema.ts` (`canvasDocuments`), `convex/projects.ts` (`persistCanvasState` via `loadCanvas` / `saveCanvas` / agent saves), shared write helpers in `lib/canvas/canvas-document.ts`, signed-in reconcile in `lib/canvas/canvas-convex-sync.ts`, agent presence in `lib/canvas/agent-presence.ts`
- **Taste → gen:** `app/api/taste/extract/route.ts` → `lib/canvas/directive-compiler.ts` → `lib/canvas/design-tree-prompt.ts` → `lib/canvas/generate-design-core.ts`
- **Plugin (product MCP, not coding-agent memory):** `extensions/cursor/README.md`

## Canonical paths

Paths the next agent should open instead of rediscovering the tree from `extensions/cursor/`:

- `SESSION.md`
- `CLAUDE.md`
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
- `lib/canvas/agent-presence.ts`
- `app/canvas-v1/components/AgentCanvasPresence.tsx`
- `lib/agent/canvas-agent-ops.ts`
- `app/api/agent/canvas/route.ts`
- `app/canvas-v1/components/CanvasCode.tsx`
- `docs/VERIFY.md`
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

That gate fails if this file drifts (missing sections, dead canonical paths, or entry docs that no longer point here). When you touch canvas sync, agent MCP, taste, export, code items, or agent presence, also run the matching `proof:*` script in `package.json` (`proof:convex-canvas-sync`, `proof:code-on-canvas`, `proof:agent-presence`).

## How to update this file

End of any session that lands work or changes the resume:

1. Set **Last updated**
2. Rewrite **Resume point** in 2–5 sentences (what landed, what is next, what is blocked)
3. Keep **Invariants** unless Nick changes them
4. Add or remove **Canonical paths** when those files move
5. Run `npm run proof:session-continuity`
6. Commit `SESSION.md` with the work
