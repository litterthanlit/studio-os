/**
 * Proof gate 0.9 — per-call token, latency and cost telemetry (mocked usage).
 *
 * 1. tracedCompletion records step, model, input/output/cached tokens from
 *    `usage`, latency, finish reason and a cost estimate from the price table.
 * 2. Failed calls are recorded (ok: false) and rethrown.
 * 3. Records are written in batches (20 per batch, remainder on flush).
 * 4. Calls inside an agent run carry its runId — through the real screen-set
 *    core, intent classifier and callModel.
 * 5. The listed call sites no longer call chat.completions.create directly.
 *
 * Run: npm run proof:model-telemetry
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { callModel, setRouterForTesting, tracedCompletion } from "../lib/ai/model-router";
import {
  flushModelTelemetry,
  setModelTelemetrySink,
  withModelTelemetryContext,
  type ModelCallRecord,
} from "../lib/ai/model-telemetry";
import { estimateModelCostUsd } from "../lib/ai/model-prices";
import { createMemoryAgentRunStore, startAgentRun } from "../lib/agent/agent-runs";
import { defaultAgentGenerationDeps, executeAgentGenerateScreenSet } from "../lib/agent/agent-generation";
import { createEmptyCanvas } from "../lib/canvas/unified-canvas-state";
import type { DesignNode } from "../lib/canvas/design-node";

const SONNET = "anthropic/claude-sonnet-4-6";
const USAGE = { prompt_tokens: 1200, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 1000 } };

const batches: ModelCallRecord[][] = [];
setModelTelemetrySink(async (records) => {
  batches.push(records);
});
const allRecords = () => batches.flat();

function screenTree(name: string): DesignNode {
  return {
    id: `root-${name}`,
    type: "frame",
    name,
    style: { display: "flex", flexDirection: "row", width: 1440, height: 900 },
    children: [{ id: `main-${name}`, type: "frame", name: "Main", style: { display: "flex", flexDirection: "column" }, children: [] }],
  };
}

function installRouter(opts: { fail?: boolean } = {}) {
  setRouterForTesting({
    chat: {
      completions: {
        create: async (params: { model: string; messages: Array<{ content: unknown }> }) => {
          await new Promise((resolve) => setTimeout(resolve, 15));
          if (opts.fail) throw Object.assign(new Error("upstream 529 overloaded"), { status: 529 });
          const text = JSON.stringify(params.messages.map((m) => m.content));
          const content = text.includes("You are planning a multi-screen app UI flow")
            ? JSON.stringify({ screens: [
                { id: "billing", name: "Billing", screenRole: "billing", purpose: "Invoices", keyElements: ["table"] },
                { id: "settings", name: "Settings", screenRole: "settings", purpose: "Prefs", keyElements: ["form"] },
              ] })
            : JSON.stringify(screenTree("Screen"));
          return {
            model: params.model,
            choices: [{ message: { content }, finish_reason: "stop" }],
            usage: USAGE,
          };
        },
      },
    },
  } as never);
}

async function testSingleCall() {
  installRouter();
  const response = await tracedCompletion("proof.single", {
    model: SONNET,
    messages: [{ role: "user", content: "hello" }],
    max_tokens: 50,
  });
  assert.equal(response.choices[0]?.finish_reason, "stop");
  await flushModelTelemetry();
  const record = allRecords().find((r) => r.step === "proof.single");
  assert.ok(record, "record written");
  assert.equal(record.model, SONNET);
  assert.equal(record.inputTokens, 1200);
  assert.equal(record.outputTokens, 300);
  assert.equal(record.cachedInputTokens, 1000);
  assert.equal(record.finishReason, "stop");
  assert.ok(record.latencyMs >= 10, `latency measured (${record.latencyMs}ms)`);
  // 200 uncached × $3 + 1000 cached × $0.30 + 300 out × $15, per 1M tokens
  assert.equal(record.costUsd, 0.0054);
  assert.equal(record.costUsd, estimateModelCostUsd(SONNET, { inputTokens: 1200, outputTokens: 300, cachedInputTokens: 1000 }));
  assert.equal(record.ok, true);
  assert.equal(estimateModelCostUsd("unknown/model", { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 }), null);
  console.log(`[proof] 1. single call: ${record.inputTokens} in (${record.cachedInputTokens} cached) / ${record.outputTokens} out, ${record.latencyMs}ms, $${record.costUsd}`);
}

async function testFailureRecorded() {
  installRouter({ fail: true });
  await assert.rejects(
    callModel({ step: "proof.failure", model: SONNET, messages: [{ role: "user", content: "x" }] }),
    /overloaded/,
  );
  await flushModelTelemetry();
  const record = allRecords().find((r) => r.step === "proof.failure");
  assert.ok(record);
  assert.equal(record.ok, false);
  assert.match(record.error ?? "", /overloaded/);
  assert.equal(record.inputTokens, 0);
  console.log("[proof] 2. failed call recorded with ok: false and the error");
}

async function testBatching() {
  installRouter();
  const before = batches.length;
  for (let i = 0; i < 25; i++) {
    await callModel({ step: "proof.batch", model: SONNET, messages: [{ role: "user", content: `n${i}` }] });
  }
  await flushModelTelemetry();
  const newBatches = batches.slice(before).map((b) => b.filter((r) => r.step === "proof.batch").length);
  assert.deepEqual(newBatches, [20, 5], "one full batch of 20, remainder on flush");
  console.log(`[proof] 3. 25 calls → batches ${JSON.stringify(newBatches)}`);
}

async function testRunIdThroughRealCallSites() {
  installRouter();
  const savedKey = process.env.OPENROUTER_API_KEY;
  const savedShot = process.env.STUDIO_OS_DISABLE_SCREENSHOT;
  process.env.OPENROUTER_API_KEY = "proof-mock-key";
  process.env.STUDIO_OS_DISABLE_SCREENSHOT = "true";
  try {
    const store = createMemoryAgentRunStore(new Map());
    let done: Promise<void> = Promise.resolve();
    let canvasState: unknown = createEmptyCanvas();
    const { runId } = await startAgentRun({
      store,
      projectId: "proj_telemetry",
      kind: "screen-set",
      input: { prompt: "Billing and settings for a SaaS dashboard app" },
      schedule: (task) => {
        done = task();
      },
      execute: (progress) =>
        executeAgentGenerateScreenSet(
          { auth: { serviceSecret: "proof" }, projectId: "proj_telemetry" as never, prompt: "Billing and settings for a SaaS dashboard app", onProgress: progress },
          {
            ...defaultAgentGenerationDeps,
            loadCanvas: async () => ({ state: canvasState, revision: 1 }),
            loadDesignState: async () => null,
            saveCanvas: async (_auth, args) => {
              canvasState = args.state;
              return { id: "doc" as never, revision: 2, unchanged: false };
            },
          },
        ),
    });
    await done;
    const run = await store.get(runId);
    assert.equal(run?.status, "complete", run?.error ?? "");

    const runRecords = allRecords().filter((r) => r.runId === runId);
    const steps = runRecords.map((r) => r.step);
    assert.ok(steps.includes("screens.plan"), "plan call traced");
    assert.equal(steps.filter((s) => s === "screens.screen").length, 2, "each screen call traced");
    assert.ok(steps.includes("intent.classify"), "intent classifier traced");
    assert.ok(runRecords.every((r) => r.projectId === "proj_telemetry"));
    const totalCost = runRecords.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
    console.log(`[proof] 4. agent run ${runId}: ${runRecords.length} calls tagged (${[...new Set(steps)].join(", ")}), est. $${totalCost.toFixed(4)}`);

    await withModelTelemetryContext({ runId: "run_ctx" }, () =>
      callModel({ step: "proof.ctx", model: SONNET, messages: [{ role: "user", content: "x" }] }),
    );
    await flushModelTelemetry();
    assert.equal(allRecords().find((r) => r.step === "proof.ctx")?.runId, "run_ctx");
  } finally {
    if (savedKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = savedKey;
    if (savedShot === undefined) delete process.env.STUDIO_OS_DISABLE_SCREENSHOT;
    else process.env.STUDIO_OS_DISABLE_SCREENSHOT = savedShot;
  }
}

function testCallSites() {
  const files = [
    "lib/canvas/generate-design-core.ts",
    "lib/canvas/generate-screen-set-core.ts",
    "lib/canvas/visual-refine-loop.ts",
    "lib/canvas/design-taste-evaluator.ts",
    "lib/canvas/intent-classifier.ts",
    "lib/ai/image-scorer.ts",
    "app/api/taste/extract/route.ts",
    "app/api/taste/analyze-composition/route.ts",
  ];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /chat\.completions\.create\(/, `${file} goes through tracedCompletion/callModel`);
  }
  const schema = readFileSync("convex/schema.ts", "utf8");
  assert.match(schema, /modelCalls: defineTable/);
  assert.match(readFileSync("convex/modelCalls.ts", "utf8"), /recordBatch/);
  console.log("[proof] 5. generation, refine, evaluator, classifier and taste routes are traced; modelCalls table present");
}

async function main() {
  try {
    await testSingleCall();
    await testFailureRecorded();
    await testBatching();
    await testRunIdThroughRealCallSites();
    testCallSites();
  } finally {
    setRouterForTesting(null);
    setModelTelemetrySink(undefined);
  }
  console.log("model-telemetry proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
