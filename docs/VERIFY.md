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
