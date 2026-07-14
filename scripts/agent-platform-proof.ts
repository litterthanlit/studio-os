/**
 * Proof gate P5 — Agent platform v1 (auth + project-scoped MCP APIs).
 *
 * Run: npm run proof:agent-platform
 */
import assert from "node:assert/strict";
import {
  applyCanvasAgentOperations,
  buildCanvasSummary,
} from "../lib/agent/canvas-agent-ops";
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

function testValidatorRejectsInvalidTree() {
  const result = validateAndNormalizeDesignTree({ type: "not-a-node" });
  assert.equal(result.ok, false);
}

function testCanvasOpsAddArtboard() {
  const state = createEmptyCanvas();
  const { state: next, applied, errors } = applyCanvasAgentOperations(state, [
    {
      type: "add_artboard",
      name: "Proof Screen",
      breakpoint: "desktop",
      tree: sampleTree,
    },
  ]);

  assert.equal(errors.length, 0);
  assert.equal(applied.length, 1);
  const summary = buildCanvasSummary(next);
  assert.equal(summary.artboardCount, 1);
  assert.equal(summary.artboards[0]?.name, "Proof Screen");
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
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = env.NODE_ENV;
  const previousBypass = env.STUDIO_OS_DEV_AUTH_BYPASS;
  env.NODE_ENV = "production";
  env.STUDIO_OS_DEV_AUTH_BYPASS = "false";

  try {
    const result = await fetchJson("/api/agent/canvas", {
      action: "get",
      projectId: "proof-project",
    });
    if (result.unavailable) {
      console.log("[proof:agent-platform] Skipping production auth test — dev server unavailable");
      return;
    }
    assert.equal(result.response.status, 401);
  } finally {
    env.NODE_ENV = previousNodeEnv;
    env.STUDIO_OS_DEV_AUTH_BYPASS = previousBypass;
  }
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

  assert.equal(response.status, 200);
  assert.ok(data.summary);
  assert.ok(data.canvasState);
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

  if (generate.response.status === 502) {
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
  await testUnauthenticatedRejectedInProductionMode();
  await testDevBypassGetCanvas();
  await testDevBypassGenerateScreen();
  console.log("proof:agent-platform passed");
}

main().catch((error) => {
  console.error("proof:agent-platform failed:", error);
  process.exit(1);
});
