/**
 * Proof gate 0.10 — async agent runs (lifts the 60 s MCP cap).
 *
 * Drives the real MCP tool handlers (`generate_screen_set`, `generate_screen`,
 * `get_run`) against an in-process stand-in for the Next routes that uses the
 * same `startAgentRun` + executor code, the real screen-set core, and a mocked
 * model router (no network, no key needed).
 *
 * 1. The MCP call returns { runId, status: "queued" } in under 5 s, while
 *    generation keeps running.
 * 2. A mocked 4-screen set completes by polling get_run.
 * 3. An injected failure yields `failed` with a message.
 * 4. A partial run lists the missing screen ids.
 *
 * Run: npm run proof:agent-runs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerStudioOsMcpTools } from "../lib/agent/mcp-tool-registry";
import {
  createMemoryAgentRunStore,
  startAgentRun,
  type AgentRunRecord,
} from "../lib/agent/agent-runs";
import {
  defaultAgentGenerationDeps,
  executeAgentGenerateScreen,
  executeAgentGenerateScreenSet,
  type AgentGenerationDeps,
} from "../lib/agent/agent-generation";
import { setRouterForTesting } from "../lib/ai/model-router";
import { createEmptyCanvas } from "../lib/canvas/unified-canvas-state";
import type { DesignNode } from "../lib/canvas/design-node";

const PROJECT_ID = "proj_runs_proof";
const MODEL_DELAY_MS = 400;

const PLAN = {
  screens: [
    { id: "overview", name: "Overview", screenRole: "overview", purpose: "Account overview", keyElements: ["stats", "activity"] },
    { id: "billing", name: "Billing", screenRole: "billing", purpose: "Plans and invoices", keyElements: ["plan card", "invoice table"] },
    { id: "members", name: "Members", screenRole: "members", purpose: "Team members", keyElements: ["member table", "invite"] },
    { id: "settings", name: "Settings", screenRole: "settings", purpose: "Preferences", keyElements: ["profile", "notifications"] },
  ],
};

function screenTree(name: string): DesignNode {
  return {
    id: `root-${name.toLowerCase()}`,
    type: "frame",
    name: `${name} Screen`,
    style: { display: "flex", flexDirection: "row", width: 1440, height: 900, background: "#FAFAF8" },
    children: [
      { id: `sidebar-${name.toLowerCase()}`, type: "frame", name: "Sidebar", style: { width: 240, display: "flex", flexDirection: "column" }, children: [] },
      {
        id: `main-${name.toLowerCase()}`,
        type: "frame",
        name: "Main",
        style: { display: "flex", flexDirection: "column", flexGrow: 1 },
        children: [{ id: `title-${name.toLowerCase()}`, type: "text", name: "Title", style: { fontSize: 18, fontWeight: 600 }, content: { text: name } }],
      },
    ],
  };
}

type RouterMode = { failPlan?: boolean; failScreens?: string[] };

function installFakeRouter(mode: RouterMode) {
  let calls = 0;
  const router = {
    chat: {
      completions: {
        create: async (params: { messages: Array<{ content: unknown }> }) => {
          calls++;
          await new Promise((resolve) => setTimeout(resolve, MODEL_DELAY_MS));
          const text = JSON.stringify(params.messages.map((m) => m.content));
          if (text.includes("You are planning a multi-screen app UI flow")) {
            if (mode.failPlan) throw new Error("injected failure: planner unavailable");
            return { choices: [{ message: { content: JSON.stringify(PLAN) }, finish_reason: "stop" }] };
          }
          const focus = text.match(/Generate ONLY the complete DesignNode tree for: \\"([^"\\]+)\\"/);
          const screen = focus?.[1] ?? "Screen";
          if (mode.failScreens?.includes(screen)) throw new Error(`injected failure: ${screen}`);
          return { choices: [{ message: { content: JSON.stringify(screenTree(screen)) }, finish_reason: "stop" }] };
        },
      },
    },
  };
  setRouterForTesting(router as never);
  return () => calls;
}

type Route = (body: Record<string, unknown>) => Promise<{ status: number; body: unknown }>;

/** In-process stand-in for the Next routes: same startAgentRun + executors; `after()` becomes a detached task. */
function createHarness() {
  const runs = new Map<string, AgentRunRecord>();
  const store = createMemoryAgentRunStore(runs);
  const pending: Promise<void>[] = [];
  let canvasState: unknown = createEmptyCanvas();
  let revision = 1;

  const deps: AgentGenerationDeps = {
    ...defaultAgentGenerationDeps,
    loadCanvas: async () => ({ state: canvasState, revision }),
    loadDesignState: async () => null,
    saveCanvas: async (_auth, args) => {
      canvasState = args.state;
      revision += 1;
      return { id: "doc" as never, revision, unchanged: false };
    },
  };

  const schedule = (task: () => Promise<void>) => {
    pending.push(new Promise<void>((resolve) => setTimeout(() => void task().then(resolve, resolve), 0)));
  };

  const routes: Record<string, Route> = {
    "/api/agent/generate-screen-set": async (body) => {
      assert.equal(body.async, true, "MCP generate_screen_set requests an async run");
      const started = await startAgentRun({
        store,
        projectId: String(body.projectId),
        kind: "screen-set",
        input: { prompt: body.prompt },
        schedule,
        execute: (progress) =>
          executeAgentGenerateScreenSet(
            { auth: { serviceSecret: "proof" }, projectId: body.projectId as never, prompt: String(body.prompt), onProgress: progress },
            deps,
          ),
      });
      return { status: 202, body: { ...started, pollWith: "get_run" } };
    },
    "/api/agent/generate-screen": async (body) => {
      assert.equal(body.async, true, "MCP generate_screen requests an async run");
      const started = await startAgentRun({
        store,
        projectId: String(body.projectId),
        kind: "screen",
        input: { prompt: body.prompt },
        schedule,
        execute: (progress) =>
          executeAgentGenerateScreen(
            { auth: { serviceSecret: "proof" }, projectId: body.projectId as never, prompt: String(body.prompt), onProgress: progress },
            { ...deps, generateScreen: async () => { throw new Error("injected failure: generator crashed"); } },
          ),
      });
      return { status: 202, body: { ...started, pollWith: "get_run" } };
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const runMatch = url.pathname.match(/^\/api\/agent\/runs\/([^/]+)$/);
    let result: { status: number; body: unknown };
    if (runMatch) {
      const run = await store.get(decodeURIComponent(runMatch[1]!));
      result = run ? { status: 200, body: run } : { status: 404, body: { error: "Run not found" } };
    } else if (routes[url.pathname]) {
      result = await routes[url.pathname]!(body);
    } else {
      result = { status: 404, body: { error: `no route ${url.pathname}` } };
    }
    return new Response(JSON.stringify(result.body), { status: result.status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  const tools: Record<string, (args: Record<string, unknown>, extra: unknown) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>> = {};
  registerStudioOsMcpTools(
    { registerTool: (name: string, _config: unknown, handler: never) => { tools[name] = handler; } } as never,
    () => ({ apiBase: "http://proof.local", headers: {}, defaultProjectId: PROJECT_ID }),
  );

  const callTool = async (name: string, args: Record<string, unknown>) => {
    const handler = tools[name];
    assert.ok(handler, `MCP tool ${name} is registered`);
    const result = await handler(args, {});
    const payload = JSON.parse(result.content[0]!.text);
    if (result.isError) throw new Error(payload.error);
    return payload;
  };

  const pollRun = async (runId: string, timeoutMs = 60_000): Promise<AgentRunRecord> => {
    const started = Date.now();
    for (;;) {
      const run = (await callTool("get_run", { runId })) as AgentRunRecord;
      if (["complete", "partial", "failed"].includes(run.status)) return run;
      if (Date.now() - started > timeoutMs) throw new Error(`run ${runId} did not finish: ${run.status}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  return {
    callTool,
    pollRun,
    settle: () => Promise.all(pending),
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

async function withEnv<T>(fn: () => Promise<T>): Promise<T> {
  const saved = { key: process.env.OPENROUTER_API_KEY, shot: process.env.STUDIO_OS_DISABLE_SCREENSHOT, lummi: process.env.LUMMI_API_KEY };
  process.env.OPENROUTER_API_KEY = "proof-mock-key";
  process.env.STUDIO_OS_DISABLE_SCREENSHOT = "true";
  delete process.env.LUMMI_API_KEY;
  try {
    return await fn();
  } finally {
    setRouterForTesting(null);
    if (saved.key === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = saved.key;
    if (saved.shot === undefined) delete process.env.STUDIO_OS_DISABLE_SCREENSHOT;
    else process.env.STUDIO_OS_DISABLE_SCREENSHOT = saved.shot;
    if (saved.lummi !== undefined) process.env.LUMMI_API_KEY = saved.lummi;
  }
}

async function testCompleteFourScreenSet() {
  const harness = createHarness();
  const modelCalls = installFakeRouter({});
  try {
    const t0 = Date.now();
    const started = await harness.callTool("generate_screen_set", { prompt: "Billing, members and settings for a SaaS dashboard app" });
    const elapsed = Date.now() - t0;
    assert.equal(started.status, "queued");
    assert.ok(typeof started.runId === "string" && started.runId.length > 0, "returns a runId");
    assert.ok(elapsed < 5000, `MCP call returned in ${elapsed}ms (< 5000)`);
    assert.ok(modelCalls() <= 1, "generation had not finished when the MCP call returned");

    const run = await harness.pollRun(started.runId);
    const generationMs = Date.now() - t0;
    assert.equal(run.status, "complete", run.error ?? "");
    assert.deepEqual(run.missingScreenIds, []);
    const screens = (run.result?.screens as Array<{ planId: string }>) ?? [];
    assert.deepEqual(screens.map((s) => s.planId), ["overview", "billing", "members", "settings"]);
    const steps = run.progress.map((p) => p.step);
    for (const step of ["queued", "running", "loading-context", "generating", "planned", "screen-complete", "writing-canvas", "complete"]) {
      assert.ok(steps.includes(step), `progress row "${step}"`);
    }
    assert.equal(steps.filter((s) => s === "screen-complete").length, 4);
    console.log(`[proof] 1+2. generate_screen_set returned in ${elapsed}ms; 4-screen run completed by polling after ${generationMs}ms (${modelCalls()} mocked calls)`);
    await harness.settle();
  } finally {
    harness.restore();
  }
}

async function testInjectedFailure() {
  const harness = createHarness();
  installFakeRouter({ failPlan: true });
  try {
    const setRun = await harness.callTool("generate_screen_set", { prompt: "Settings and billing for a SaaS dashboard app" });
    const failedSet = await harness.pollRun(setRun.runId);
    assert.equal(failedSet.status, "failed");
    assert.ok(failedSet.error && failedSet.error.length > 0, "failed run carries a message");

    const screenRun = await harness.callTool("generate_screen", { prompt: "Settings screen" });
    assert.equal(screenRun.status, "queued");
    const failedScreen = await harness.pollRun(screenRun.runId);
    assert.equal(failedScreen.status, "failed");
    assert.match(failedScreen.error ?? "", /injected failure: generator crashed/);
    console.log(`[proof] 3. injected failures → failed: "${failedSet.error}" / "${failedScreen.error}"`);
    await harness.settle();
  } finally {
    harness.restore();
  }
}

async function testPartialRun() {
  const harness = createHarness();
  installFakeRouter({ failScreens: ["Billing", "Members"] });
  try {
    const started = await harness.callTool("generate_screen_set", { prompt: "Billing, members and settings for a SaaS dashboard app" });
    const run = await harness.pollRun(started.runId);
    assert.equal(run.status, "partial");
    assert.deepEqual(run.missingScreenIds, ["billing", "members"]);
    assert.match(run.error ?? "", /Missing screens: billing, members/);
    assert.equal(run.progress.filter((p) => p.step === "screen-failed").length, 2);
    console.log(`[proof] 4. partial run lists missing ids: ${run.missingScreenIds.join(", ")}`);
    await harness.settle();
  } finally {
    harness.restore();
  }
}

function testWiring() {
  for (const route of ["app/api/agent/generate-screen/route.ts", "app/api/agent/generate-screen-set/route.ts"]) {
    const src = readFileSync(route, "utf8");
    assert.match(src, /startAgentRun\(/, `${route} starts async runs`);
    assert.match(src, /after\(task\)/, `${route} executes with next/server after()`);
    assert.match(src, /export const maxDuration = \d+/, `${route} sets maxDuration`);
  }
  assert.match(readFileSync("app/api/agent/runs/[id]/route.ts", "utf8"), /agentRunStoreFor/);
  assert.match(readFileSync("convex/schema.ts", "utf8"), /agentRuns: defineTable/);
  assert.match(readFileSync("extensions/cursor/skills/studio-canvas/SKILL.md", "utf8"), /get_run/);
  console.log("[proof] wiring: routes use after(); runs route + agentRuns table + skill doc present");
}

async function main() {
  testWiring();
  await withEnv(async () => {
    await testCompleteFourScreenSet();
    await testInjectedFailure();
    await testPartialRun();
  });
  console.log("agent-runs proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
