# VERIFY

Manual and proof-script checks that are easy to miss in a coding session.

## Canvas source of truth (debut track 1)

Signed-in editor and agents share **one** Convex `canvasDocuments` row per project and **one** revision counter.

Conflict rule (signed in, project has a Convex id):

1. No remote document → seed Convex from the local cache.
2. Remote revision differs from local sync meta → **remote wins**. localStorage never replaces a newer remote revision (a higher local revision is stale cache, not authority).
3. Same revision and local `savedAt` is newer → unsynced draft of that revision; push with `expectedRevision` set to it.
4. UI `CANVAS_REVISION_CONFLICT` must **not** last-write-wins over an agent write. Toast + reload.

Shared write path:

- Apply ops: `applyCanvasDocumentWrite` (`lib/canvas/canvas-document.ts`)
- Serialize: `prepareCanvasDocumentSave` (UI full-state save uses this too)
- Persist: `persistCanvasState` in `convex/projects.ts` (`saveCanvas`, `saveCanvasForAgent`, `saveCanvasForUserAgent`)

```bash
npm run proof:convex-canvas-sync
```

Live check (signed-in project with `convexProjectId`):

1. Edit an artboard in the editor; wait ~8s for the throttled Convex save.
2. In the Convex dashboard, open `canvasDocuments` for that project and note `revision` N.
3. Agent `POST /api/agent/canvas` `{ action: "write", ... }` with `expectedRevision: N`.
4. Same row: `revision` is N+1. Editor toast or auto-apply shows the agent change. Local cache must not overwrite N+1 on reload.

## Canvas save throttle (Convex usage)

Prod Sep 2026: almost all Convex calls were `projects.saveCanvas` + `projects.loadCanvas` (~1:1). The editor saved on every reducer change (~3.5s) and `persistCanvasState` inserted a `canvasSnapshots` row per revision.

After:

- **Dirty-only:** Convex save runs only when the persist fingerprint changes (items / components / export / authored prompt). Viewport, selection, `updatedAt`, and prompt chrome do not count.
- **Debounce:** 8s trailing after the last meaningful change. Drag/pan bursts collapse to one save. Idle editor with no edits → **zero** Convex writes.
- **No echo:** remote `APPLY_REMOTE_STATE` / load adopt the hash and must not schedule `saveCanvas`. Server no-ops when `contentHash` matches (no revision bump, so `loadCanvas` does not re-fire).
- **Snapshots:** agent writes always; user writes every 20 revisions or 10 minutes, whichever first. Keep newest 20 per document; prune older rows in batches. First snapshot write on a bloated document continues pruning in the background.

```bash
npm run proof:canvas-save-throttle
```

Live check:

1. Open a signed-in canvas. Pan and click-select for 30s. Convex dashboard: **no** new `saveCanvas` / `loadCanvas` while idle after that.
2. Drag an artboard, stop. At most **one** `saveCanvas` in the next ~8s. Same content a second later: **no** additional save.
3. Agent write auto-applies in the open editor: `saveCanvas` must not fire as an echo of that apply.

Before/after call volume (signed-in editor left open):

| | Before | After |
|---|---|---|
| Idle pan/select | ~1 `saveCanvas` + `loadCanvas` every 3.5s | 0 |
| Continuous drag | 1 write per throttle window, snapshot every write | 1 write after pointer-up + 8s; snapshot at most every 20 user revisions or 10 min |
| Remote apply | could save again (revision bump → query → apply → save) | 0 echo writes |

## Code on canvas (debut track 2)

Code/spec items are a first-class `kind: "code"` in `UnifiedCanvasState.items`. They have **no DesignNode tree** (`getNodeTree` returns null). Human edits (reducer `ADD_CODE` / `UPDATE_ITEM`) and agent ops (`add_code_item` / `patch_code`) both persist through the Track 1 path (`prepareCanvasDocumentSave` → `persistCanvasState`). Saves stay dirty-only with the 8s trailing debounce.

```bash
npm run proof:code-on-canvas
npm run proof:convex-canvas-sync
```

Live check (signed-in project with `convexProjectId`):

1. In the editor, Layers → Code → **Add code** (or press `C`, or Inspector empty state **Add code**). A code item appears on the canvas.
2. Select it. Inspector shows label, language, and content. Edit the text; wait ~8s for the throttled Convex save.
3. Convex `canvasDocuments` for that project: `items` includes `{ kind: "code", ... }`. Note `revision` N.
4. Agent write: `POST /api/agent/canvas` `{ action: "write", operations: [{ type: "patch_code", itemId, content: "..." }], expectedRevision: N }`.
5. Same row: `revision` is N+1 and the code item content matches the patch. Reload the editor: the patched text is still there (remote SoT, not a local-only draft).

## Agent presence (debut track 3)

Agent writes stamp document-level authorship on the same `canvasDocuments` row: `lastWriter: "agent"`, `lastAgentAt`, `lastAgentRevision`. The signed-in editor reads this from the reactive `loadCanvas` query (no polling). Human undo must not persist over a newer agent revision. Authorship is not written on `contentHash` no-ops.

```bash
npm run proof:agent-presence
npm run proof:convex-canvas-sync
```

Live check (signed-in project with `convexProjectId`, editor tab open):

1. Note Convex `canvasDocuments.revision` N for the open project.
2. Agent write: `POST /api/agent/canvas` `{ action: "write", operations: [...], expectedRevision: N }`.
3. Same row: `revision` is N+1, `lastWriter` is `"agent"`, `lastAgentRevision` is N+1. Editor chrome shows **Agent updated canvas** with that revision (auto-apply or toast). No Connect Cursor / paste-token step required.
4. Human undo: after the agent revision is applied, Cmd+Z must **not** restore pre-agent items onto Convex. History is reset on `APPLY_REMOTE_STATE`. If an agent revision is **ahead** of the editor’s applied revision, undo/save is blocked: toast **Agent updated canvas** + Reload (same Track 1 conflict rule; no last-write-wins).
5. Agent writes still send `expectedRevision`; mismatch returns 409 `CANVAS_REVISION_CONFLICT`.

Chrome preview (dev only, no Convex required): open `/canvas?project=starter-canvas&agentPresence=1` for the presence chip, or `agentPresence=conflict` for the agent toast. Live authorship still comes from `loadCanvas`.
