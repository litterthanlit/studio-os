/**
 * Proof gate — debut track 3: live agent presence on the canvas SoT document.
 *
 * Agent writes stamp lastWriter/lastAgentAt/lastAgentRevision. The editor
 * shows presence from the reactive loadCanvas query. Human undo must not
 * persist over a newer agent revision.
 *
 * Run: npm run proof:agent-presence
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  authorshipFromCanvasDocument,
  canvasDocumentAuthorshipPatch,
  externalUpdateToastCopy,
  formatAgentPresence,
  parseCanvasWriter,
  shouldBlockLocalPersistForNewerRemote,
} from "../lib/canvas/agent-presence";
import {
  canvasReducer,
  canUndoState,
  createInitialReducerState,
} from "../lib/canvas/canvas-reducer";
import { createEmptyCanvas } from "../lib/canvas/unified-canvas-state";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string) {
  return readFileSync(join(root, relative), "utf8");
}

function testParseWriter() {
  assert.equal(parseCanvasWriter("agent"), "agent");
  assert.equal(parseCanvasWriter("user"), "user");
  assert.equal(parseCanvasWriter("crdt"), null);
  assert.equal(parseCanvasWriter(undefined), null);
}

function testAuthorshipFromDocument() {
  const empty = authorshipFromCanvasDocument(null);
  assert.equal(empty.lastWriter, null);
  assert.equal(empty.revision, null);

  const doc = authorshipFromCanvasDocument({
    revision: 12,
    lastWriter: "agent",
    lastAgentAt: 1_700_000_000_000,
    lastAgentRevision: 12,
  });
  assert.equal(doc.lastWriter, "agent");
  assert.equal(doc.lastAgentRevision, 12);
  assert.equal(doc.revision, 12);
}

function testAuthorshipPatchPreservesAgentMarkersOnUserWrite() {
  const agent = canvasDocumentAuthorshipPatch({
    writer: "agent",
    nextRevision: 8,
    time: 100,
  });
  assert.equal(agent.lastWriter, "agent");
  assert.equal(agent.lastAgentAt, 100);
  assert.equal(agent.lastAgentRevision, 8);

  const user = canvasDocumentAuthorshipPatch({
    writer: "user",
    nextRevision: 9,
    time: 200,
  });
  assert.equal(user.lastWriter, "user");
  assert.equal(user.lastAgentAt, undefined);
  assert.equal(user.lastAgentRevision, undefined);
}

function testPresenceCopy() {
  const now = 1_700_000_120_000;
  const hidden = formatAgentPresence(
    {
      lastWriter: "user",
      lastAgentAt: now - 1_000,
      lastAgentRevision: 7,
      revision: 8,
    },
    now,
  );
  assert.equal(hidden.visible, false);

  const shown = formatAgentPresence(
    {
      lastWriter: "agent",
      lastAgentAt: now - 2_000,
      lastAgentRevision: 12,
      revision: 12,
    },
    now,
  );
  assert.equal(shown.visible, true);
  assert.equal(shown.headline, "Agent updated canvas");
  assert.match(shown.meta, /rev 12/);
  assert.match(shown.meta, /just now/);

  assert.equal(externalUpdateToastCopy("agent"), "Agent updated canvas");
  assert.equal(externalUpdateToastCopy("user"), "Canvas updated externally");
  assert.equal(externalUpdateToastCopy(null), "Canvas updated externally");
}

function testUndoMustNotClobberNewerAgentRevision() {
  assert.equal(
    shouldBlockLocalPersistForNewerRemote({
      localAppliedRevision: 5,
      remoteRevision: 6,
    }),
    true,
  );
  assert.equal(
    shouldBlockLocalPersistForNewerRemote({
      localAppliedRevision: 6,
      remoteRevision: 6,
    }),
    false,
  );
  assert.equal(
    shouldBlockLocalPersistForNewerRemote({
      localAppliedRevision: 6,
      remoteRevision: 5,
    }),
    false,
  );
  assert.equal(
    shouldBlockLocalPersistForNewerRemote({
      localAppliedRevision: null,
      remoteRevision: 6,
    }),
    false,
  );
}

function testRemoteApplyResetsHistory() {
  const initial = createInitialReducerState(createEmptyCanvas());
  const withHistory = canvasReducer(initial, {
    type: "PUSH_HISTORY",
    description: "Human edit",
  });
  assert.equal(canUndoState(withHistory), true);

  const applied = canvasReducer(withHistory, {
    type: "APPLY_REMOTE_STATE",
    state: createEmptyCanvas(),
  });
  assert.equal(canUndoState(applied), false);
  const undone = canvasReducer(applied, { type: "UNDO" });
  assert.equal(undone.items.length, applied.items.length);
}

function testSchemaAndPersistWiring() {
  const schema = read("convex/schema.ts");
  assert.match(schema, /lastWriter/);
  assert.match(schema, /lastAgentAt/);
  assert.match(schema, /lastAgentRevision/);

  const projects = read("convex/projects.ts");
  assert.match(projects, /canvasDocumentAuthorshipPatch/);
  assert.match(projects, /writer: "agent"/);
  assert.match(projects, /parseCanvasWriter\(args\.writer\) \?\? "user"/);
  assert.equal(
    (projects.match(/return await persistCanvasState/g) ?? []).length,
    3,
    "saveCanvas, saveCanvasForAgent, and saveCanvasForUserAgent must all call persistCanvasState",
  );

  const agentClient = read("lib/agent/convex-agent-client.ts");
  assert.match(agentClient, /writer: "agent"/);

  const context = read("lib/canvas/canvas-context.tsx");
  assert.match(context, /shouldBlockLocalPersistForNewerRemote/);
  assert.match(context, /formatAgentPresence/);
  assert.match(context, /AgentCanvasPresence/);
  assert.match(context, /dispatchGuarded/);
  assert.doesNotMatch(context, /forceLastWriteWins/);

  const reducer = read("lib/canvas/canvas-reducer.ts");
  assert.match(reducer, /history: createHistoryStack\(50\)/);
  assert.doesNotMatch(reducer, /Agent canvas update/);

  const toast = read("app/canvas-v1/components/ExternalCanvasUpdateToast.tsx");
  assert.match(toast, /message/);

  const presenceUi = read("app/canvas-v1/components/AgentCanvasPresence.tsx");
  assert.match(presenceUi, /data-agent-presence/);
  assert.match(presenceUi, /Agent updated canvas|headline/);
  assert.doesNotMatch(presenceUi, /rounded-xl/);
  assert.doesNotMatch(presenceUi, /rounded-lg/);

  const verify = read("docs/VERIFY.md");
  assert.match(verify, /Agent presence/);
  assert.match(verify, /npm run proof:agent-presence/);
  assert.match(verify, /Human undo/);
}

function main() {
  testParseWriter();
  testAuthorshipFromDocument();
  testAuthorshipPatchPreservesAgentMarkersOnUserWrite();
  testPresenceCopy();
  testUndoMustNotClobberNewerAgentRevision();
  testRemoteApplyResetsHistory();
  testSchemaAndPersistWiring();
  console.log("proof:agent-presence passed (7/7)");
}

main();
