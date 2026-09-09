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

1. Edit an artboard in the editor; wait ~4s for the throttled Convex save.
2. In the Convex dashboard, open `canvasDocuments` for that project and note `revision` N.
3. Agent `POST /api/agent/canvas` `{ action: "write", ... }` with `expectedRevision: N`.
4. Same row: `revision` is N+1. Editor toast or auto-apply shows the agent change. Local cache must not overwrite N+1 on reload.
