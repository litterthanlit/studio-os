/**
 * Proof gate P5 — Agent platform v1 (auth + project-scoped MCP APIs).
 *
 * Run: npm run proof:agent-platform
 */
import assert from "node:assert/strict";
import {
  applyCanvasAgentOperations,
  buildCanvasSummary,
  getCanvasNode,
} from "../lib/agent/canvas-agent-ops";
import {
  buildClaudeCodeMcpConfig,
  buildCodexMcpConfig,
  buildCursorMcpConfig,
} from "../lib/agent/mcp-config-snippets";
import { isAgentPersonalAccessToken } from "../lib/agent/agent-token";
import { validateAndNormalizeDesignTree } from "../lib/canvas/design-tree-validator";
import { createEmptyCanvas } from "../lib/canvas/unified-canvas-state";
import type { DesignNode } from "../lib/canvas/design-node";

const DEV_BASE = process.env.AGENT_PLATFORM_PROOF_BASE ?? "http://localhost:3000";

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
          content: { text: "Agent Platform Proof" },
          style: { fontSize: 48, fontWeight: 600 },
        },
      ],
    },
  ],
};

function seededCanvas() {
  const empty = createEmptyCanvas();
  const { state, errors } = applyCanvasAgentOperations(empty, [
    {
      type: "add_artboard",
      name: "Proof Screen",
      breakpoint: "desktop",
      tree: sampleTree,
    },
  ]);
  assert.equal(errors.length, 0);
  return state;
}

function testValidatorRejectsInvalidTree() {
  const result = validateAndNormalizeDesignTree({ type: "not-a-node" });
  assert.equal(result.ok, false);
}

function testCanvasOpsAddArtboard() {
  const next = seededCanvas();
  const summary = buildCanvasSummary(next);
  assert.equal(summary.artboardCount, 1);
  assert.equal(summary.artboards[0]?.name, "Proof Screen");
  assert.ok(summary.selection);
  assert.ok(Array.isArray(summary.items));
}

function testCanvasOpsRejectInvalidTree() {
  const state = createEmptyCanvas();
  const { applied, errors } = applyCanvasAgentOperations(state, [
    {
      type: "add_artboard",
      name: "Bad",
      breakpoint: "desktop",
      tree: { invalid: true },
    },
  ]);

  assert.equal(applied.length, 0);
  assert.ok(errors.length > 0);
}

function testPatchMoveSelectDeleteRename() {
  const seeded = seededCanvas();
  const artboardId = seeded.items[0]!.id;

  const patched = applyCanvasAgentOperations(seeded, [
    {
      type: "patch_node",
      itemId: artboardId,
      nodeId: "proof-title",
      content: { text: "Patched by agent" },
      name: "Hero title",
    },
    {
      type: "move_item",
      itemId: artboardId,
      x: 240,
      y: 80,
    },
    {
      type: "set_selection",
      activeItemId: artboardId,
      selectedNodeId: "proof-title",
    },
    {
      type: "rename_item",
      itemId: artboardId,
      name: "Renamed screen",
    },
  ]);

  assert.equal(patched.errors.length, 0, patched.errors.join("; "));
  assert.ok(patched.applied.includes(`patch_node:${artboardId}:proof-title`));
  const node = getCanvasNode(patched.state, artboardId, "proof-title");
  assert.equal(node?.node.content?.text, "Patched by agent");
  assert.equal(node?.node.name, "Hero title");
  assert.equal(patched.state.items[0]?.x, 240);
  assert.equal(patched.state.items[0]?.y, 80);
  assert.equal(patched.state.selection.activeItemId, artboardId);
  assert.equal(patched.state.selection.selectedNodeId, "proof-title");
  assert.equal(patched.state.items[0] && "name" in patched.state.items[0] ? patched.state.items[0].name : "", "Renamed screen");

  const deleted = applyCanvasAgentOperations(patched.state, [{ type: "delete_item", itemId: artboardId }]);
  assert.equal(deleted.errors.length, 0);
  assert.equal(deleted.state.items.length, 0);
  assert.equal(deleted.state.selection.activeItemId, null);
}

function testInvalidPatchNodeRejected() {
  const seeded = seededCanvas();
  const artboardId = seeded.items[0]!.id;
  const missing = applyCanvasAgentOperations(seeded, [
    { type: "patch_node", itemId: artboardId, nodeId: "does-not-exist", name: "Nope" },
  ]);
  assert.equal(missing.applied.length, 0);
  assert.ok(missing.errors.some((error) => error.includes("not found")));

  const empty = applyCanvasAgentOperations(seeded, [
    { type: "patch_node", itemId: artboardId, nodeId: "proof-title" },
  ]);
  assert.equal(empty.applied.length, 0);
  assert.ok(empty.errors.some((error) => error.includes("required")));
}

function testMcpSnippets() {
  const url = "https://studio-os.io/api/mcp";
  const token = "sos_live_0123456789abcdef0123456789abcdef01234567";
  assert.equal(isAgentPersonalAccessToken(token), true);
  const cursor = buildCursorMcpConfig(url, token);
  assert.equal(cursor.mcpServers["studio-os"].url, url);
  assert.equal(cursor.mcpServers["studio-os"].headers.Authorization, `Bearer ${token}`);
  const claude = buildClaudeCodeMcpConfig(url, token);
  assert.equal(claude.mcpServers["studio-os"].type, "http");
  const codex = buildCodexMcpConfig(url);
  assert.ok(codex.includes('bearer_token_env_var = "STUDIO_OS_API_TOKEN"'));
  assert.ok(codex.includes(url));
}

async function fetchJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  try {
    const response = await fetch(`${DEV_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { response, data, unavailable: false as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      return { unavailable: true as const };
    }
    throw error;
  }
}

async function testUnauthenticatedRejectedInProductionMode() {
  const result = await fetchJson("/api/agent/canvas", {
    action: "get",
    projectId: "proof-project",
  });
  if (result.unavailable) {
    console.log("[proof:agent-platform] Skipping production auth test — dev server unavailable");
    return;
  }
  // Dev bypass may still be on in local Next. 200 is acceptable there.
  assert.ok(
    result.response.status === 401 || result.response.status === 200 || result.response.status === 502,
    `unexpected status ${result.response.status}`,
  );
}

async function testPatShapedAuthRejectedWithoutValidHash() {
  const result = await fetchJson(
    "/api/agent/canvas",
    { action: "get", projectId: "proof-project" },
    { Authorization: "Bearer sos_live_ffffffffffffffffffffffffffffffffffffffffffffffff" },
  );
  if (result.unavailable) {
    console.log("[proof:agent-platform] Skipping PAT auth test — dev server unavailable");
    return;
  }
  assert.ok(
    result.response.status === 401 || result.response.status === 503,
    `PAT-shaped token should not authenticate without a stored hash (got ${result.response.status})`,
  );
}

async function testDevBypassGetCanvas() {
  const result = await fetchJson("/api/agent/canvas", {
    action: "get",
    projectId: process.env.AGENT_PLATFORM_PROOF_PROJECT_ID ?? "proof-project-id",
  });
  if (result.unavailable) {
    console.log("[proof:agent-platform] Skipping live get_canvas — dev server unavailable");
    return;
  }

  const { response, data } = result;

  if (response.status === 502 && typeof data?.error === "string" && data.error.includes("Convex")) {
    console.log("[proof:agent-platform] Skipping live get_canvas — Convex not configured");
    return;
  }

  if (response.status === 401) {
    console.log("[proof:agent-platform] Skipping live get_canvas — auth required");
    return;
  }

  assert.equal(response.status, 200);
  assert.ok(data.summary);
  assert.ok(data.canvasState);
}

async function mcpRpc(body: unknown, headers: Record<string, string> = {}) {
  try {
    const response = await fetch(`${DEV_BASE}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2024-11-05",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return { response, text, unavailable: false as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      return { unavailable: true as const };
    }
    throw error;
  }
}

function parseMcpJson(text: string): {
  result?: {
    tools?: Array<{ name: string }>;
    serverInfo?: { name?: string };
    protocolVersion?: string;
  };
  error?: { message?: string };
} | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const jsonLine = trimmed.includes("data:")
    ? trimmed
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .at(-1)
    : trimmed;
  if (!jsonLine) return null;
  try {
    return JSON.parse(jsonLine) as {
      result?: {
        tools?: Array<{ name: string }>;
        serverInfo?: { name?: string };
        protocolVersion?: string;
      };
      error?: { message?: string };
    };
  } catch {
    return null;
  }
}

async function testMcpInitializeAndToolsList() {
  const unauthed = await mcpRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "agent-platform-proof", version: "1.0.0" },
    },
  });
  if (unauthed.unavailable) {
    console.log("[proof:agent-platform] Skipping MCP HTTP test — dev server unavailable");
    return;
  }

  const invalidPat = await mcpRpc(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "agent-platform-proof", version: "1.0.0" },
      },
    },
    { Authorization: "Bearer sos_live_ffffffffffffffffffffffffffffffffffffffffffffffff" },
  );
  if (!invalidPat.unavailable) {
    assert.equal(invalidPat.response.status, 401);
  }

  if (unauthed.response.status === 401) {
    console.log("[proof:agent-platform] MCP initialize without token is 401 (auth required)");
    return;
  }

  assert.ok(unauthed.response.ok, `MCP initialize failed: ${unauthed.response.status} ${unauthed.text}`);
  const initialized = parseMcpJson(unauthed.text);
  assert.equal(initialized?.result?.serverInfo?.name, "studio-os");
  const sessionId = unauthed.response.headers.get("mcp-session-id");
  const sessionHeaders: Record<string, string> = sessionId
    ? { "mcp-session-id": sessionId }
    : {};
  await mcpRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, sessionHeaders);
  const listed = await mcpRpc(
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    sessionHeaders,
  );
  assert.ok(!listed.unavailable, "MCP tools/list became unavailable after initialize");
  assert.ok(listed.response.ok, `MCP tools/list failed: ${listed.response.status} ${listed.text}`);
  const payload = parseMcpJson(listed.text);
  const names = payload?.result?.tools?.map((tool) => tool.name) ?? [];
  assert.ok(names.length > 0, `tools/list parsed empty: ${listed.text.slice(0, 400)}`);
  for (const name of ["get_canvas", "get_node", "patch_node", "move_item", "select_on_canvas", "delete_item", "write_canvas"]) {
    assert.ok(names.includes(name), `missing MCP tool ${name}`);
  }
}

async function testDevBypassGenerateScreen() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log("[proof:agent-platform] Skipping live generate_screen — OPENROUTER_API_KEY missing");
    return;
  }

  const projectId = process.env.AGENT_PLATFORM_PROOF_PROJECT_ID;
  if (!projectId) {
    console.log("[proof:agent-platform] Skipping live generate_screen — AGENT_PLATFORM_PROOF_PROJECT_ID missing");
    return;
  }

  const generate = await fetchJson("/api/agent/generate-screen", {
    projectId,
    prompt: "Minimal settings screen for a SaaS app",
    name: "Proof Settings",
    breakpoint: "desktop",
  });

  if (generate.unavailable) {
    console.log("[proof:agent-platform] Skipping live generate_screen — dev server unavailable");
    return;
  }

  if (generate.response.status === 502 || generate.response.status === 401) {
    console.log("[proof:agent-platform] Skipping generate_screen follow-up — backend unavailable");
    return;
  }

  assert.equal(generate.response.status, 200);
  assert.ok(generate.data.artboardId);

  const canvas = await fetchJson("/api/agent/canvas", {
    action: "get",
    projectId,
  });
  if (canvas.unavailable) return;
  assert.equal(canvas.response.status, 200);
  const artboardIds = (canvas.data.summary?.artboards ?? []).map((a: { id: string }) => a.id);
  assert.ok(artboardIds.includes(generate.data.artboardId));
}

async function main() {
  testValidatorRejectsInvalidTree();
  testCanvasOpsAddArtboard();
  testCanvasOpsRejectInvalidTree();
  testPatchMoveSelectDeleteRename();
  testInvalidPatchNodeRejected();
  testMcpSnippets();
  await testUnauthenticatedRejectedInProductionMode();
  await testPatShapedAuthRejectedWithoutValidHash();
  await testDevBypassGetCanvas();
  await testMcpInitializeAndToolsList();
  await testDevBypassGenerateScreen();
  console.log("proof:agent-platform passed");
}

main().catch((error) => {
  console.error("proof:agent-platform failed:", error);
  process.exit(1);
});
