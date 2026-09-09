/**
 * Proof gate — debut track 2: code items on the canvas SoT document.
 *
 * Code/spec items live in UnifiedCanvasState.items, have no DesignNode tree,
 * and persist through the Track 1 shared write path.
 *
 * Run: npm run proof:code-on-canvas
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyCanvasAgentOperations,
  buildCanvasSummary,
  getCanvasCode,
} from "../lib/agent/canvas-agent-ops";
import { getNodeTree, isEditableItem, withUpdatedTree } from "../lib/canvas/canvas-item-conversion";
import {
  applyCanvasDocumentWrite,
  prepareCanvasDocumentSave,
} from "../lib/canvas/canvas-document";
import { stripCanvasForPersistence } from "../lib/canvas/canvas-persistence";
import {
  canvasReducer,
  createInitialReducerState,
} from "../lib/canvas/canvas-reducer";
import {
  CODE_CONTENT_MAX_CHARS,
  clampCodeContent,
  createCodeItem,
  createEmptyCanvas,
  isCodeItem,
  normalizeCodeLanguage,
} from "../lib/canvas/unified-canvas-state";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string) {
  return readFileSync(join(root, relative), "utf8");
}

import type { DesignNode } from "../lib/canvas/design-node";

const dummyTree: DesignNode = {
  id: "proof-root",
  type: "frame",
  name: "Root",
  style: { width: 1440, height: 900 },
  children: [],
};

function testCreateCodeItemHasNoDesignTree() {
  const item = createCodeItem({
    name: "Auth spec",
    language: "TypeScript",
    content: "export function login() {}",
  });
  assert.equal(item.kind, "code");
  assert.equal(item.language, "typescript");
  assert.equal(item.name, "Auth spec");
  assert.equal(getNodeTree(item), null);
  assert.equal(isEditableItem(item), false);
  assert.equal(withUpdatedTree(item, dummyTree), item);
  assert.equal(isCodeItem(item), true);
}

function testLanguageAndContentGuards() {
  assert.equal(normalizeCodeLanguage("TSX"), "tsx");
  assert.equal(normalizeCodeLanguage("!!!"), "plaintext");
  assert.equal(normalizeCodeLanguage(""), "typescript");
  const clamped = clampCodeContent("a".repeat(CODE_CONTENT_MAX_CHARS + 20));
  assert.equal(clamped.length, CODE_CONTENT_MAX_CHARS);
}

function testAgentAddAndPatchCode() {
  const empty = createEmptyCanvas();
  const added = applyCanvasAgentOperations(empty, [
    {
      type: "add_code_item",
      name: "API contract",
      language: "json",
      content: '{"ok":true}',
      x: 200,
      y: 120,
    },
  ]);
  assert.equal(added.errors.length, 0, added.errors.join("; "));
  assert.equal(added.state.items.length, 1);
  const item = added.state.items[0];
  assert.ok(item && isCodeItem(item));
  assert.equal(item.name, "API contract");
  assert.equal(item.language, "json");
  assert.equal(item.content, '{"ok":true}');
  assert.equal(item.x, 200);
  assert.equal(item.y, 120);

  const summary = buildCanvasSummary(added.state);
  assert.equal(summary.codeCount, 1);
  assert.equal(summary.codeItems[0]?.id, item.id);
  assert.equal(summary.codeItems[0]?.language, "json");
  assert.equal(getCanvasCode(added.state, item.id)?.content, '{"ok":true}');

  const patched = applyCanvasAgentOperations(added.state, [
    {
      type: "patch_code",
      itemId: item.id,
      content: "export const ok = true;",
      language: "typescript",
      name: "Flags",
    },
  ]);
  assert.equal(patched.errors.length, 0, patched.errors.join("; "));
  const next = getCanvasCode(patched.state, item.id);
  assert.equal(next?.content, "export const ok = true;");
  assert.equal(next?.language, "typescript");
  assert.equal(next?.name, "Flags");
}

function testPatchCodeRejectsDesignItems() {
  const seeded = applyCanvasAgentOperations(createEmptyCanvas(), [
    {
      type: "add_reference",
      imageUrl: "https://example.com/ref.png",
      title: "Ref",
    },
  ]);
  assert.equal(seeded.errors.length, 0, seeded.errors.join("; "));
  const referenceId = seeded.state.items[0]!.id;
  const result = applyCanvasAgentOperations(seeded.state, [
    { type: "patch_code", itemId: referenceId, content: "nope" },
  ]);
  assert.equal(result.applied.length, 0);
  assert.ok(result.errors.some((error) => error.includes("not code")));
}

function testSharedPersistPathKeepsCode() {
  const written = applyCanvasDocumentWrite(createEmptyCanvas(), [
    {
      type: "add_code_item",
      name: "SoT code",
      language: "spec",
      content: "# contract\nGET /health",
    },
  ]);
  assert.equal(written.errors.length, 0);
  assert.equal(written.state.items[0]?.kind, "code");
  const uiPayload = prepareCanvasDocumentSave(written.state);
  assert.deepEqual(uiPayload.state.items, written.state.items);
  const stripped = stripCanvasForPersistence(written.state);
  assert.equal(stripped.items[0]?.kind, "code");
  assert.ok(isCodeItem(stripped.items[0]!));
  assert.equal(stripped.items[0].content, "# contract\nGET /health");
}

function testReducerAddCodeSelectsWithoutActivatingTree() {
  const initial = createInitialReducerState(createEmptyCanvas());
  const withHistory = canvasReducer(initial, { type: "PUSH_HISTORY", description: "Add code" });
  const next = canvasReducer(withHistory, { type: "ADD_CODE", name: "From UI" });
  assert.equal(next.items.length, 1);
  assert.equal(next.items[0]?.kind, "code");
  assert.equal(next.selection.selectedItemIds[0], next.items[0]?.id);
  assert.equal(next.selection.activeItemId, null);
  assert.equal(getNodeTree(next.items[0]!), null);
}

function testUiCreatePushesHistoryFirst() {
  const inspector = read("app/canvas-v1/components/InspectorPanelV3.tsx");
  const layers = read("app/canvas-v1/components/LayersPanelV3.tsx");
  const keyboard = read("app/canvas-v1/hooks/useCanvasKeyboard.ts");
  for (const source of [inspector, layers, keyboard]) {
    const addIndex = source.indexOf('type: "ADD_CODE"');
    const historyIndex = source.lastIndexOf("PUSH_HISTORY", addIndex);
    assert.ok(addIndex > 0, "ADD_CODE dispatch missing");
    assert.ok(historyIndex >= 0 && historyIndex < addIndex, "PUSH_HISTORY must precede ADD_CODE");
  }
}

function testMcpAndApiSurface() {
  const registry = read("lib/agent/mcp-tool-registry.ts");
  assert.match(registry, /"add_code_item"/);
  assert.match(registry, /"patch_code"/);
  assert.match(registry, /"get_code"/);
  const route = read("app/api/agent/canvas/route.ts");
  assert.match(route, /action === "get_code"/);
  const ops = read("lib/agent/canvas-agent-ops.ts");
  assert.match(ops, /type: "add_code_item"/);
  assert.match(ops, /type: "patch_code"/);
  const verify = read("docs/VERIFY.md");
  assert.match(verify, /Code on canvas/);
  assert.match(verify, /npm run proof:code-on-canvas/);
}

function main() {
  testCreateCodeItemHasNoDesignTree();
  testLanguageAndContentGuards();
  testAgentAddAndPatchCode();
  testPatchCodeRejectsDesignItems();
  testSharedPersistPathKeepsCode();
  testReducerAddCodeSelectsWithoutActivatingTree();
  testUiCreatePushesHistoryFirst();
  testMcpAndApiSurface();
  console.log("proof:code-on-canvas passed (8/8)");
}

main();
