/**
 * Proof gate P4 — Convex canvas source of truth (debut track 1).
 *
 * Signed-in UI saves and agent writes must land on the same canvasDocuments
 * row, share persistCanvasState / revision, and never let localStorage beat
 * a newer remote revision.
 *
 * Run: npm run proof:convex-canvas-sync
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  decideSignedInCanvasSource,
  isValidRemoteCanvasState,
  normalizeRemoteCanvasState,
  reconcileCanvasSources,
  shouldPromptExternalReload,
  stripCanvasForPersistence,
} from "../lib/canvas/canvas-convex-sync";
import {
  applyCanvasDocumentWrite,
  CANVAS_DOCUMENT_SCHEMA_VERSION,
  prepareCanvasDocumentSave,
} from "../lib/canvas/canvas-document";
import { createEmptyCanvas } from "../lib/canvas/unified-canvas-state";
import type { DesignNode } from "../lib/canvas/design-node";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string) {
  return readFileSync(join(root, relative), "utf8");
}

function makeRemoteDoc(revision: number, savedAt: number, state = createEmptyCanvas()) {
  return {
    revision,
    state,
    lastSavedAt: savedAt,
    updatedAt: savedAt,
  };
}

const sampleTree: DesignNode = {
  id: "proof-root",
  type: "frame",
  name: "Root",
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    width: 1440,
    height: 900,
    background: "#FAFAF8",
    padding: { top: 48, right: 48, bottom: 48, left: 48 },
  },
  children: [
    {
      id: "proof-hero",
      type: "frame",
      name: "Hero",
      style: { display: "flex", flexDirection: "column", gap: 16 },
      children: [
        {
          id: "proof-title",
          type: "text",
          name: "Title",
          content: { text: "Canvas SoT" },
          style: { fontSize: 48, fontWeight: 600 },
        },
      ],
    },
  ],
};

function testStripCanvasForPersistence() {
  const state = createEmptyCanvas();
  state.prompt.isGenerating = true;
  state.prompt.agentSteps = ["Analyzing references"];

  const stripped = stripCanvasForPersistence(state);
  assert.equal(stripped.prompt.isGenerating, false);
  assert.deepEqual(stripped.prompt.agentSteps, []);
  assert.equal(stripped.aiPreview, null);
}

function testRemoteWinsWhenNewer() {
  const localState = createEmptyCanvas();
  localState.updatedAt = new Date(1_000).toISOString();

  const remoteState = createEmptyCanvas();
  remoteState.updatedAt = new Date(5_000).toISOString();

  const result = reconcileCanvasSources({
    localState,
    localMeta: { revision: 1, savedAt: 1_000, source: "local" },
    remoteDoc: makeRemoteDoc(4, 5_000, remoteState),
  });

  assert.equal(result.shouldReplaceLocal, true);
  assert.equal(result.pushLocalToRemote, false);
  assert.equal(result.appliedRevision, 4);
  assert.equal(result.state.updatedAt, remoteState.updatedAt);
  assert.equal(
    decideSignedInCanvasSource({
      localMeta: { revision: 1, savedAt: 1_000, source: "local" },
      remoteDoc: makeRemoteDoc(4, 5_000, remoteState),
    }),
    "adopt-remote",
  );
}

function testNewerRemoteRevisionWinsDespiteNewerLocalClock() {
  const localState = createEmptyCanvas();
  localState.updatedAt = new Date(9_000).toISOString();

  const remoteState = createEmptyCanvas();
  remoteState.updatedAt = new Date(5_000).toISOString();

  const result = reconcileCanvasSources({
    localState,
    localMeta: { revision: 2, savedAt: 9_000, source: "local" },
    remoteDoc: makeRemoteDoc(4, 5_000, remoteState),
  });

  assert.equal(result.shouldReplaceLocal, true);
  assert.equal(result.pushLocalToRemote, false);
  assert.equal(result.appliedRevision, 4);
  assert.equal(result.state.updatedAt, remoteState.updatedAt);
}

function testStaleLocalRevisionDoesNotOverrideRemote() {
  const localState = createEmptyCanvas();
  const remoteState = createEmptyCanvas();
  remoteState.updatedAt = new Date(1_000).toISOString();

  const result = reconcileCanvasSources({
    localState,
    localMeta: { revision: 9, savedAt: 9_000, source: "local" },
    remoteDoc: makeRemoteDoc(4, 1_000, remoteState),
  });

  assert.equal(result.shouldReplaceLocal, true);
  assert.equal(result.pushLocalToRemote, false);
  assert.equal(result.appliedRevision, 4);
}

function testSameRevisionUnsyncedLocalMayPush() {
  const localState = createEmptyCanvas();
  localState.updatedAt = new Date(9_000).toISOString();
  const remoteState = createEmptyCanvas();
  remoteState.updatedAt = new Date(5_000).toISOString();

  const result = reconcileCanvasSources({
    localState,
    localMeta: { revision: 4, savedAt: 9_000, source: "local" },
    remoteDoc: makeRemoteDoc(4, 5_000, remoteState),
  });

  assert.equal(result.shouldReplaceLocal, false);
  assert.equal(result.pushLocalToRemote, true);
  assert.equal(result.appliedRevision, 4);
  assert.equal(result.state.updatedAt, localState.updatedAt);
  assert.equal(
    decideSignedInCanvasSource({
      localMeta: { revision: 4, savedAt: 9_000, source: "local" },
      remoteDoc: makeRemoteDoc(4, 5_000, remoteState),
    }),
    "keep-local-push-unsynced",
  );
}

function testSameRevisionInSyncKeepsLocalWithoutPush() {
  const localState = createEmptyCanvas();
  const remoteState = createEmptyCanvas();

  const result = reconcileCanvasSources({
    localState,
    localMeta: { revision: 4, savedAt: 5_000, source: "remote" },
    remoteDoc: makeRemoteDoc(4, 5_000, remoteState),
  });

  assert.equal(result.shouldReplaceLocal, false);
  assert.equal(result.pushLocalToRemote, false);
  assert.equal(result.appliedRevision, 4);
}

function testRemoteUsedWhenNoLocalMeta() {
  const localState = createEmptyCanvas();
  const remoteState = createEmptyCanvas();
  remoteState.updatedAt = new Date(2_000).toISOString();

  const result = reconcileCanvasSources({
    localState,
    localMeta: null,
    remoteDoc: makeRemoteDoc(1, 2_000, remoteState),
  });

  assert.equal(result.shouldReplaceLocal, true);
  assert.equal(result.pushLocalToRemote, false);
  assert.equal(result.appliedRevision, 1);
}

function testSeedWhenNoRemote() {
  const localState = createEmptyCanvas();
  const result = reconcileCanvasSources({
    localState,
    localMeta: { revision: 0, savedAt: 1_000, source: "local" },
    remoteDoc: null,
  });
  assert.equal(result.shouldReplaceLocal, false);
  assert.equal(result.pushLocalToRemote, true);
  assert.equal(
    decideSignedInCanvasSource({
      localMeta: { revision: 0, savedAt: 1_000, source: "local" },
      remoteDoc: null,
    }),
    "seed-local",
  );
}

function testExternalReloadPrompt() {
  assert.equal(shouldPromptExternalReload(2, 3), true);
  assert.equal(shouldPromptExternalReload(3, 3), false);
  assert.equal(shouldPromptExternalReload(null, 3), false);
}

function testNormalizeRemoteCanvasState() {
  const remote = {
    schemaVersion: 3,
    items: [],
    prompt: {
      isGenerating: true,
      agentSteps: ["Analyzing references"],
    },
  };

  assert.equal(isValidRemoteCanvasState(remote), true);
  const normalized = normalizeRemoteCanvasState(remote);
  assert.equal(normalized.schemaVersion, 4);
  assert.equal(normalized.prompt.isGenerating, false);
  assert.deepEqual(normalized.prompt.agentSteps, []);
}

function testSharedSavePayloadForUiAndAgent() {
  const empty = createEmptyCanvas();
  empty.prompt.isGenerating = true;

  const written = applyCanvasDocumentWrite(empty, [
    {
      type: "add_artboard",
      name: "SoT Screen",
      breakpoint: "desktop",
      tree: sampleTree,
    },
  ]);
  assert.equal(written.errors.length, 0);
  assert.equal(written.applied.length, 1);
  assert.equal(written.schemaVersion, CANVAS_DOCUMENT_SCHEMA_VERSION);
  assert.equal(written.state.prompt.isGenerating, false);

  const uiPayload = prepareCanvasDocumentSave(written.state);
  assert.equal(uiPayload.schemaVersion, written.schemaVersion);
  assert.equal(uiPayload.state.schemaVersion, written.state.schemaVersion);
  assert.deepEqual(uiPayload.state.prompt, written.state.prompt);
  assert.equal(uiPayload.state.items.length, written.state.items.length);
  assert.equal(uiPayload.state.items[0]?.kind, "artboard");
}

function testSharedConvexPersistPath() {
  const projects = read("convex/projects.ts");
  assert.equal(
    (projects.match(/return await persistCanvasState/g) ?? []).length,
    3,
    "saveCanvas, saveCanvasForAgent, and saveCanvasForUserAgent must all call persistCanvasState",
  );
  assert.match(projects, /export const saveCanvas = mutation\(/);
  assert.match(projects, /export const saveCanvasForAgent = mutation\(/);
  assert.match(projects, /export const saveCanvasForUserAgent = mutation\(/);
  assert.match(
    projects,
    /Single persist path for the project's canvas document/,
  );

  const context = read("lib/canvas/canvas-context.tsx");
  assert.match(context, /prepareCanvasDocumentSave/);
  assert.match(context, /hasInitialReconciledRef\.current/);
  assert.match(context, /remote is source of truth; not overwriting/);
  assert.doesNotMatch(context, /forceLastWriteWins/);
  assert.doesNotMatch(context, /retrying with last-write-wins/);

  const document = read("lib/canvas/canvas-document.ts");
  assert.match(document, /prepareCanvasDocumentSave/);
  assert.match(document, /applyCanvasDocumentWrite/);

  assert.match(read("app/api/agent/canvas/route.ts"), /applyCanvasDocumentWrite/);
  assert.match(read("app/api/agent/generate-screen/route.ts"), /applyCanvasDocumentWrite/);
  assert.match(read("app/api/agent/generate-screen-set/route.ts"), /applyCanvasDocumentWrite/);

  const verify = read("docs/VERIFY.md");
  assert.match(verify, /Canvas source of truth/);
  assert.match(verify, /npm run proof:convex-canvas-sync/);
}

function main() {
  testStripCanvasForPersistence();
  testRemoteWinsWhenNewer();
  testNewerRemoteRevisionWinsDespiteNewerLocalClock();
  testStaleLocalRevisionDoesNotOverrideRemote();
  testSameRevisionUnsyncedLocalMayPush();
  testSameRevisionInSyncKeepsLocalWithoutPush();
  testRemoteUsedWhenNoLocalMeta();
  testSeedWhenNoRemote();
  testExternalReloadPrompt();
  testNormalizeRemoteCanvasState();
  testSharedSavePayloadForUiAndAgent();
  testSharedConvexPersistPath();
  console.log("proof:convex-canvas-sync passed (12/12)");
}

main();
