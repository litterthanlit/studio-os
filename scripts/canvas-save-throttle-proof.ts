/**
 * Proof gate — canvas Convex save thrash + snapshot retention.
 *
 * Sep 2026 prod: saveCanvas ~720K and loadCanvas ~696K, almost 1:1, because
 * every reducer change scheduled a write and every write inserted a snapshot.
 *
 * This gate locks:
 * 1. Persist fingerprint ignores viewport / selection / prompt chrome.
 * 2. Local edits in one debounce window → one flush; pan-only → zero.
 * 3. Remote APPLY does not cascade a Convex save.
 * 4. Snapshots are not inserted on every user revision.
 *
 * Run: npm run proof:canvas-save-throttle
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createEmptyCanvas } from "../lib/canvas/unified-canvas-state";
import {
  CANVAS_SNAPSHOT_EVERY_N_REVISIONS,
  CANVAS_SNAPSHOT_KEEP_PER_DOCUMENT,
  CANVAS_SNAPSHOT_MIN_INTERVAL_MS,
  CONVEX_SAVE_DEBOUNCE_MS,
  countTrailingDebounceFlushes,
  decideConvexSaveAfterStateChange,
  hashCanvasPersistState,
  shouldWriteCanvasSnapshot,
} from "../lib/canvas/canvas-save-policy";
import { prepareCanvasDocumentSave } from "../lib/canvas/canvas-document";
import type { ArtboardItem } from "../lib/canvas/unified-canvas-state";
import type { DesignNode } from "../lib/canvas/design-node";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string) {
  return readFileSync(join(root, relative), "utf8");
}

const sampleTree: DesignNode = {
  id: "proof-root",
  type: "frame",
  name: "Root",
  style: { display: "flex", width: 1440, height: 900 },
  children: [],
};

function withArtboard(state = createEmptyCanvas()) {
  const item: ArtboardItem = {
    id: "ab-1",
    kind: "artboard",
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
    zIndex: 1,
    locked: false,
    siteId: "site-1",
    breakpoint: "desktop",
    name: "Desktop",
    pageTree: sampleTree,
    compiledCode: "/* regenerated */",
  };
  return { ...state, items: [...state.items, item] };
}

function testFingerprintIgnoresEphemeralChrome() {
  const base = withArtboard();
  const noisy = {
    ...base,
    updatedAt: new Date(9_999_999).toISOString(),
    viewport: { pan: { x: 480, y: -120 }, zoom: 1.75 },
    selection: {
      selectedItemIds: ["ab-1"],
      activeItemId: "ab-1",
      selectedNodeId: "proof-root",
      selectedNodeIds: ["proof-root"],
    },
    prompt: {
      ...base.prompt,
      isOpen: !base.prompt.isOpen,
      splitRatio: 0.4,
      isGenerating: true,
      agentSteps: ["Composing layout..."],
      generationResult: "success" as const,
    },
  };

  assert.equal(
    hashCanvasPersistState(base),
    hashCanvasPersistState(noisy),
    "viewport, selection, prompt chrome, and updatedAt must not dirty Convex",
  );

  const moved = {
    ...base,
    items: base.items.map((item) =>
      item.id === "ab-1" ? { ...item, x: item.x + 40 } : item,
    ),
  };
  assert.notEqual(
    hashCanvasPersistState(base),
    hashCanvasPersistState(moved),
    "item edits must dirty Convex",
  );

  const payload = prepareCanvasDocumentSave(noisy);
  assert.equal(payload.contentHash, hashCanvasPersistState(base));
  assert.equal(payload.state.prompt.isGenerating, false);
}

function testLocalEditsCollapseToOneSavePerWindow() {
  const hashes = Array.from({ length: 24 }, (_, i) => `edit-${i}`);
  const events = hashes.map((persistHash, i) => ({
    t: i * 80,
    persistHash,
    source: "local" as const,
  }));
  const flushes = countTrailingDebounceFlushes(events, CONVEX_SAVE_DEBOUNCE_MS);
  assert.equal(
    flushes,
    1,
    "rapid local edits in one throttle window must flush once",
  );
  assert.ok(CONVEX_SAVE_DEBOUNCE_MS >= 8_000, "debounce must stay raised");
}

function testPanOnlyDoesNotSave() {
  const hash = hashCanvasPersistState(withArtboard());
  const events = Array.from({ length: 40 }, (_, i) => ({
    t: 10_000 + i * 16,
    persistHash: hash,
    source: "local" as const,
  }));
  // Seed lastSavedHash by flushing a matching remote apply first.
  const flushes = countTrailingDebounceFlushes(
    [{ t: 0, persistHash: hash, source: "remote-apply" }, ...events],
    CONVEX_SAVE_DEBOUNCE_MS,
  );
  assert.equal(flushes, 0, "pan/selection-only hashes must not schedule Convex");
}

function testRemoteApplyDoesNotCascadeSaves() {
  const localDirty = countTrailingDebounceFlushes(
    [
      { t: 0, persistHash: "local-a", source: "local" },
      { t: 120, persistHash: "local-b", source: "local" },
      { t: 200, persistHash: "remote-c", source: "remote-apply" },
      { t: 400, persistHash: "remote-c", source: "local" },
    ],
    CONVEX_SAVE_DEBOUNCE_MS,
  );
  assert.equal(localDirty, 0, "remote APPLY must cancel pending save and not echo");

  assert.deepEqual(
    decideConvexSaveAfterStateChange({
      source: "remote-apply",
      persistHash: "remote-c",
      lastSavedHash: "local-b",
    }),
    { schedule: false, adoptHash: true },
  );
}

function testSnapshotPolicy() {
  const now = 1_000_000;
  assert.equal(
    shouldWriteCanvasSnapshot({
      writer: "user",
      isInsert: true,
      nextRevision: 1,
      lastSnapshotAt: null,
      lastSnapshotRevision: null,
      now,
    }),
    true,
  );
  assert.equal(
    shouldWriteCanvasSnapshot({
      writer: "user",
      isInsert: false,
      nextRevision: 2,
      lastSnapshotAt: now,
      lastSnapshotRevision: 1,
      now: now + 1_000,
    }),
    false,
    "user revision 2 must not snapshot",
  );
  assert.equal(
    shouldWriteCanvasSnapshot({
      writer: "agent",
      isInsert: false,
      nextRevision: 2,
      lastSnapshotAt: now,
      lastSnapshotRevision: 1,
      now: now + 1_000,
    }),
    true,
    "agent writes always snapshot",
  );
  assert.equal(
    shouldWriteCanvasSnapshot({
      writer: "user",
      isInsert: false,
      nextRevision: 1 + CANVAS_SNAPSHOT_EVERY_N_REVISIONS,
      lastSnapshotAt: now,
      lastSnapshotRevision: 1,
      now: now + 1_000,
    }),
    true,
  );
  assert.equal(
    shouldWriteCanvasSnapshot({
      writer: "user",
      isInsert: false,
      nextRevision: 3,
      lastSnapshotAt: now,
      lastSnapshotRevision: 1,
      now: now + CANVAS_SNAPSHOT_MIN_INTERVAL_MS,
    }),
    true,
  );
  assert.ok(CANVAS_SNAPSHOT_KEEP_PER_DOCUMENT >= 10);
}

function testSourceContracts() {
  const context = read("lib/canvas/canvas-context.tsx");
  assert.match(context, /decideConvexSaveAfterStateChange/);
  assert.match(context, /lastSavedHashRef/);
  assert.match(context, /CONVEX_SAVE_DEBOUNCE_MS/);
  assert.match(context, /"remote-apply"/);
  assert.doesNotMatch(context, /CONVEX_SAVE_THROTTLE_MS\s*=\s*3500/);
  assert.doesNotMatch(
    context,
    /pendingConvexStateRef\.current = nextState;\s*\n\s*appliedRemoteRevisionRef/,
  );

  const projects = read("convex/projects.ts");
  assert.match(projects, /hashCanvasPersistState/);
  assert.match(projects, /shouldWriteCanvasSnapshot/);
  assert.match(projects, /unchanged: true/);
  assert.match(projects, /if \(writeSnapshot\)/);
  assert.match(projects, /pruneCanvasSnapshots/);
  assert.match(projects, /persistCanvasState\(ctx, project, args, "user"\)/);
  assert.match(projects, /persistCanvasState\(ctx, project, args, "agent"\)/);
  assert.equal(
    (projects.match(/return await persistCanvasState/g) ?? []).length,
    3,
  );

  const schema = read("convex/schema.ts");
  assert.match(schema, /contentHash/);
  assert.match(schema, /lastSnapshotAt/);
  assert.match(schema, /Newest 20 per document are kept/);

  const verify = read("docs/VERIFY.md");
  assert.match(verify, /Canvas save throttle/);
  assert.match(verify, /npm run proof:canvas-save-throttle/);
}

function main() {
  testFingerprintIgnoresEphemeralChrome();
  testLocalEditsCollapseToOneSavePerWindow();
  testPanOnlyDoesNotSave();
  testRemoteApplyDoesNotCascadeSaves();
  testSnapshotPolicy();
  testSourceContracts();
  console.log("proof:canvas-save-throttle passed (6/6)");
}

main();
