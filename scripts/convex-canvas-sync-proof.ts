/**
 * Proof gate P4 — Convex canvas reconciliation helpers.
 *
 * Run: npm run proof:convex-canvas-sync
 */
import assert from "node:assert/strict";
import {
  isValidRemoteCanvasState,
  normalizeRemoteCanvasState,
  reconcileCanvasSources,
  shouldPromptExternalReload,
  stripCanvasForPersistence,
} from "../lib/canvas/canvas-convex-sync";
import { createEmptyCanvas } from "../lib/canvas/unified-canvas-state";

function makeRemoteDoc(revision: number, savedAt: number, state = createEmptyCanvas()) {
  return {
    revision,
    state,
    lastSavedAt: savedAt,
    updatedAt: savedAt,
  };
}

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
  assert.equal(result.appliedRevision, 4);
  assert.equal(result.state.updatedAt, remoteState.updatedAt);
}

function testLocalWinsWhenNewer() {
  const localState = createEmptyCanvas();
  localState.updatedAt = new Date(9_000).toISOString();

  const remoteState = createEmptyCanvas();
  remoteState.updatedAt = new Date(5_000).toISOString();

  const result = reconcileCanvasSources({
    localState,
    localMeta: { revision: 2, savedAt: 9_000, source: "local" },
    remoteDoc: makeRemoteDoc(4, 5_000, remoteState),
  });

  assert.equal(result.shouldReplaceLocal, false);
  assert.equal(result.pushLocalToRemote, true);
  assert.equal(result.state.updatedAt, localState.updatedAt);
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
  assert.equal(result.appliedRevision, 1);
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

function main() {
  testStripCanvasForPersistence();
  testRemoteWinsWhenNewer();
  testLocalWinsWhenNewer();
  testRemoteUsedWhenNoLocalMeta();
  testExternalReloadPrompt();
  testNormalizeRemoteCanvasState();
  console.log("proof:convex-canvas-sync passed (6/6)");
}

main();
