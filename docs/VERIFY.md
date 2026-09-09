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

## Code on canvas (debut track 2)

Code/spec items are a first-class `kind: "code"` in `UnifiedCanvasState.items`. They have **no DesignNode tree** (`getNodeTree` returns null). Human edits (reducer `ADD_CODE` / `UPDATE_ITEM`) and agent ops (`add_code_item` / `patch_code`) both persist through the Track 1 path (`prepareCanvasDocumentSave` → `persistCanvasState`).

```bash
npm run proof:code-on-canvas
npm run proof:convex-canvas-sync
```

Live check (signed-in project with `convexProjectId`):

1. In the editor, Layers → Code → **Add code** (or press `C`, or Inspector empty state **Add code**). A code item appears on the canvas.
2. Select it. Inspector shows label, language, and content. Edit the text; wait ~4s for the throttled Convex save.
3. Convex `canvasDocuments` for that project: `items` includes `{ kind: "code", ... }`. Note `revision` N.
4. Agent write: `POST /api/agent/canvas` `{ action: "write", operations: [{ type: "patch_code", itemId, content: "..." }], expectedRevision: N }`.
5. Same row: `revision` is N+1 and the code item content matches the patch. Reload the editor: the patched text is still there (remote SoT, not a local-only draft).
