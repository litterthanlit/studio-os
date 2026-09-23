/**
 * Proof gate 0.5 — agent writes survive human edits; selection results are honest.
 *
 * 1. A designer save lands between the agent's load and save; the agent write
 *    rebases (reload, re-apply, retry) and both the designer's edit and the
 *    generated artboard end up in the document.
 * 2. Retries stop after 3; a caller-pinned expectedRevision is not rebased.
 * 3. select_on_canvas: a selection-only write hashes identical to the saved
 *    canvas, so the persist path is a no-op, and the result says
 *    selection.persisted: false with an explanation.
 *
 * The in-memory document mirrors convex/projects.ts persistCanvasState:
 * identical contentHash → unchanged; expectedRevision mismatch → CANVAS_REVISION_CONFLICT.
 *
 * Run: npm run proof:agent-write-rebase
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hashCanvasPersistState } from "../lib/canvas/canvas-content-hash";
import { applyCanvasDocumentWrite } from "../lib/canvas/canvas-document";
import { createEmptyCanvas, type UnifiedCanvasState } from "../lib/canvas/unified-canvas-state";
import type { DesignNode } from "../lib/canvas/design-node";
import { SELECTION_NOT_PERSISTED, writeCanvasWithRebase } from "../lib/agent/canvas-write-rebase";
import {
  defaultAgentGenerationDeps,
  executeAgentGenerateScreen,
} from "../lib/agent/agent-generation";

const tree: DesignNode = {
  id: "gen-root",
  type: "frame",
  name: "Generated",
  style: { display: "flex", flexDirection: "column", width: 1440, height: 900 },
  children: [
    {
      id: "gen-main",
      type: "frame",
      name: "Main",
      style: { display: "flex", flexDirection: "column" },
      children: [{ id: "gen-title", type: "text", name: "Title", style: { fontSize: 48 }, content: { text: "Agent screen" } }],
    },
  ],
};

/** Mirrors persistCanvasState's hash + revision semantics. */
function createDocumentStore(initial: UnifiedCanvasState) {
  let doc = { state: initial as unknown, revision: 1, contentHash: hashCanvasPersistState(initial) };
  const saves: Array<{ expectedRevision?: number; result: string }> = [];
  return {
    load: async () => ({ state: structuredClone(doc.state), revision: doc.revision }),
    save: async (payload: { state: unknown; expectedRevision?: number }) => {
      const contentHash = hashCanvasPersistState(payload.state);
      if (contentHash === doc.contentHash) {
        saves.push({ expectedRevision: payload.expectedRevision, result: "unchanged" });
        return { revision: doc.revision, unchanged: true };
      }
      if (typeof payload.expectedRevision === "number" && payload.expectedRevision !== doc.revision) {
        saves.push({ expectedRevision: payload.expectedRevision, result: "conflict" });
        throw new Error("[CONVEX M(projects:saveCanvasForUserAgent)] Uncaught Error: CANVAS_REVISION_CONFLICT");
      }
      doc = { state: payload.state, revision: doc.revision + 1, contentHash };
      saves.push({ expectedRevision: payload.expectedRevision, result: `saved r${doc.revision}` });
      return { revision: doc.revision, unchanged: false };
    },
    /** Simulate the designer's editor saving a change right now. */
    designerSave: (mutate: (state: UnifiedCanvasState) => UnifiedCanvasState) => {
      const next = mutate(structuredClone(doc.state) as UnifiedCanvasState);
      doc = { state: next, revision: doc.revision + 1, contentHash: hashCanvasPersistState(next) };
    },
    current: () => doc,
    saves,
  };
}

function withDesignerNote(state: UnifiedCanvasState, text: string): UnifiedCanvasState {
  return {
    ...state,
    items: [
      ...state.items,
      { id: `note-${text}`, kind: "note", x: 0, y: 0, width: 200, height: 120, rotation: 0, zIndex: 1, locked: false, text, color: "#FFF4C2" } as never,
    ],
  };
}

async function testDesignerSaveBetweenLoadAndSave() {
  const store = createDocumentStore(createEmptyCanvas());
  let loads = 0;
  const outcome = await executeAgentGenerateScreen(
    { auth: { serviceSecret: "proof" }, projectId: "proj_rebase" as never, prompt: "Settings screen", name: "Agent Settings" },
    {
      ...defaultAgentGenerationDeps,
      loadCanvas: async () => {
        loads++;
        const doc = await store.load();
        // The designer saves right after the agent's first load.
        if (loads === 1) store.designerSave((state) => withDesignerNote(state, "designer-edit"));
        return doc;
      },
      saveCanvas: async (_auth, args) => {
        const result = await store.save(args);
        return { id: "doc" as never, ...result };
      },
      loadDesignState: async () => null,
      generateScreen: async () => ({
        ok: true,
        siteName: "Proof",
        generationResult: "v6",
        v6Debug: { attempted: true } as never,
        variants: [{ id: "v1", name: "Base", description: "", pageTree: tree } as never],
      }),
    },
  );

  assert.equal(outcome.status, 200, JSON.stringify(outcome.body).slice(0, 300));
  assert.deepEqual(store.saves.map((s) => s.result), ["conflict", "saved r3"], "first save conflicts, rebased save lands");
  const final = store.current().state as UnifiedCanvasState;
  assert.ok(final.items.some((i) => i.id === "note-designer-edit"), "designer edit survives");
  assert.ok(final.items.some((i) => i.kind === "artboard" && i.name === "Agent Settings"), "agent artboard lands");
  assert.equal(outcome.body.revision, 3);
  console.log("[proof] 1. designer save between load and save → rebased; designer note + agent artboard both landed (r3)");
}

async function testRetryLimitAndPinnedRevision() {
  const store = createDocumentStore(createEmptyCanvas());
  let edits = 0;
  await assert.rejects(
    writeCanvasWithRebase({
      load: async () => {
        const doc = await store.load();
        store.designerSave((state) => withDesignerNote(state, `busy-${edits++}`)); // designer saves every time
        return doc;
      },
      save: (payload) => store.save(payload),
      buildOperations: () => [{ type: "add_artboard", name: "Never lands", breakpoint: "desktop", tree }],
    }),
    /CANVAS_REVISION_CONFLICT/,
  );
  assert.equal(store.saves.filter((s) => s.result === "conflict").length, 4, "1 attempt + 3 retries, then give up");

  const pinnedStore = createDocumentStore(createEmptyCanvas());
  pinnedStore.designerSave((state) => withDesignerNote(state, "moved-on"));
  await assert.rejects(
    writeCanvasWithRebase({
      load: pinnedStore.load,
      save: (payload) => pinnedStore.save(payload),
      buildOperations: () => [{ type: "add_artboard", name: "Pinned", breakpoint: "desktop", tree }],
      pinnedRevision: 1,
    }),
    /CANVAS_REVISION_CONFLICT/,
  );
  assert.equal(pinnedStore.saves.length, 1, "a caller-pinned expectedRevision is not rebased");
  console.log("[proof] 2. retries stop after 3; pinned expectedRevision surfaces the conflict");
}

async function testSelectionHonesty() {
  const seeded = applyCanvasDocumentWrite(createEmptyCanvas(), [
    { type: "add_artboard", name: "Screen", breakpoint: "desktop", tree },
  ]);
  const store = createDocumentStore(seeded.state);
  const artboardId = seeded.state.items[0]!.id;

  const selected = applyCanvasDocumentWrite(seeded.state, [
    { type: "set_selection", activeItemId: artboardId, selectedNodeId: "gen-title" },
  ]);
  assert.equal(selected.state.selection.activeItemId, artboardId, "selection applied to state");
  assert.equal(
    hashCanvasPersistState(selected.state),
    hashCanvasPersistState(seeded.state),
    "selection is outside the persist fingerprint",
  );

  const write = await writeCanvasWithRebase({
    load: store.load,
    save: (payload) => store.save(payload),
    buildOperations: () => [{ type: "set_selection", activeItemId: artboardId, selectedNodeId: "gen-title" }],
  });
  assert.equal(write.save?.unchanged, true, "persist path is a no-op for selection-only writes");
  assert.deepEqual(write.selection, SELECTION_NOT_PERSISTED);
  assert.equal(write.selection?.persisted, false);
  assert.match(write.selection?.reason ?? "", /not saved/);

  const route = readFileSync("app/api/agent/canvas/route.ts", "utf8");
  assert.match(route, /persisted: !write\.save\.unchanged/);
  assert.match(route, /selection: write\.selection/);
  assert.match(readFileSync("convex/projects.ts", "utf8"), /CANVAS_REVISION_CONFLICT/, "server still enforces expectedRevision");
  console.log("[proof] 3. select_on_canvas → unchanged save, selection.persisted: false with explanation");
}

async function main() {
  await testDesignerSaveBetweenLoadAndSave();
  await testRetryLimitAndPinnedRevision();
  await testSelectionHonesty();
  console.log("agent-write-rebase proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
