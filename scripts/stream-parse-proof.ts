/**
 * Proof gate 1.9 — Live Build: stream sections onto the canvas as they generate.
 *
 * 1. A chunked fixture (arbitrary chunk sizes, down to one character; fences,
 *    braces / quotes / "children" inside strings, nested children) emits every
 *    top-level section in order, each as soon as it closes.
 * 2. The final tree from the streamed text equals the non-streamed parse
 *    (raw parse and validated / normalized tree).
 * 3. Truncation recovery: a stream cut mid-section keeps the sections already
 *    emitted, and the recovered tree starts with exactly those sections.
 * 4. The streamed model call reassembles content / finish reason / usage and
 *    records telemetry; the real generation core streams the base call when a
 *    section callback is given; the engine lands sections on the run as partial
 *    outputs with "section-ready" progress, and the editor reads them in order.
 *
 * Run: npm run proof:stream-parse
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { createSectionStreamParser } from "../lib/engine/stream-parse";
import { parseDesignNodeResponse } from "../lib/canvas/generate-design-core";
import { validateAndNormalizeDesignTree } from "../lib/canvas/design-tree-validator";
import { setRouterForTesting, tracedStreamCompletion } from "../lib/ai/model-router";
import { pendingModelCallRecords, setModelTelemetrySink } from "../lib/ai/model-telemetry";
import { createEngineDeps } from "../lib/engine/deps";
import { executePipeline } from "../lib/engine/pipeline";
import { createMemoryRunStore } from "../lib/engine/run-store";
import { ENGINE_STEPS, type EngineInput } from "../lib/engine/types";
import { partialSectionsFromRun, progressLabels } from "../lib/engine/client";

setModelTelemetrySink(null);

const text = (id: string, value: string, size = 16) => ({ id, type: "text", name: `Text ${id}`, style: { fontSize: size }, content: { text: value } });
const section = (id: string, name: string, extra: any[] = []) => ({
  id, type: "frame", name, style: { display: "flex", flexDirection: "column", padding: { top: 80, right: 64, bottom: 80, left: 64 } },
  children: [text(`${id}-h`, `${name}: "quoted" {braces} [brackets] \\ backslash, "children": [] ✦`, 48), ...extra],
});
const TREE = {
  id: "root", type: "frame", name: "Page", style: { display: "flex", flexDirection: "column", width: 1440 },
  children: [
    section("frame-hero", "Hero", [{ id: "frame-cta", type: "frame", name: "CTA row", style: { display: "flex", gap: 12 }, children: [{ id: "button-a", type: "button", name: "Primary", style: {}, content: { text: "Start → now", href: "/start" } }] }]),
    section("frame-work", "Selected work", [{ id: "frame-grid", type: "frame", name: "Grid", style: { display: "grid", gridTemplate: "repeat(3, 1fr)" }, children: [1, 2, 3].map((n) => ({ id: `image-${n}`, type: "image", name: `Work ${n}`, style: {}, content: { src: "photo:ceramic vase on linen, soft light", alt: "Vase" } })) }]),
    section("frame-about", "About"),
    section("frame-press", "Press"),
    section("frame-footer", "Footer"),
  ],
};
const FULL = "Here is the design:\n```json\n" + JSON.stringify(TREE, null, 1) + "\n```";

function chunks(input: string, seed: number, max: number): string[] {
  const out: string[] = [];
  let x = seed;
  for (let i = 0; i < input.length; ) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const n = 1 + (x % max);
    out.push(input.slice(i, i + n));
    i += n;
  }
  return out;
}

function testChunkedOrder() {
  for (const [seed, max] of [[1, 1], [7, 5], [42, 17], [99, 400], [3, 5000]] as const) {
    const parts = chunks(FULL, seed, max);
    const emittedAt: number[] = [];
    const parser = createSectionStreamParser({ onSection: () => emittedAt.push(parser.text().length) });
    for (const part of parts) parser.push(part);
    const sections = parser.sections();
    assert.deepEqual(sections.map((s) => s.index), [0, 1, 2, 3, 4], `seed ${seed}: indexes in order`);
    assert.deepEqual(sections.map((s) => s.node), TREE.children, `seed ${seed}/max ${max}: sections equal the tree's children, in order`);
    if (max < 50) {
      // Each section is emitted when its closing brace arrives, not at the end.
      for (let i = 0; i < sections.length; i++) assert.ok(emittedAt[i]! < FULL.length, `section ${i} emitted before the stream ended`);
      assert.ok(emittedAt.every((at, i) => i === 0 || at > emittedAt[i - 1]!), "emitted progressively");
      assert.ok(emittedAt[0]! < FULL.length / 2, "the first section lands in the first half of the stream");
    }
  }
  console.log("[proof] 1. chunked fixtures (1…5000-char chunks) emit all 5 sections in order, each as it closes");
}

function testFinalEqualsNonStreamed() {
  const parser = createSectionStreamParser();
  for (const part of chunks(FULL, 5, 9)) parser.push(part);
  assert.equal(parser.text(), FULL);
  const streamed = parseDesignNodeResponse(parser.text(), "stop");
  const direct = parseDesignNodeResponse(FULL, "stop");
  assert.deepEqual(streamed, direct);
  const a = validateAndNormalizeDesignTree(streamed);
  const b = validateAndNormalizeDesignTree(direct);
  assert.ok(a.ok && b.ok);
  assert.deepEqual(a, b, "validated trees equal");
  console.log("[proof] 2. final tree from the stream equals the non-streamed parse (raw + validated)");
}

function testTruncation() {
  const compact = JSON.stringify(TREE);
  const cut = compact.indexOf('"id":"frame-press"') + 40; // mid 4th section
  const parser = createSectionStreamParser();
  for (const part of chunks(compact.slice(0, cut), 11, 13)) parser.push(part);
  const emitted = parser.sections().map((s) => s.node);
  assert.equal(emitted.length, 3, "three complete sections before the cut");
  const recovered = JSON.parse(parser.recover()!) as any;
  assert.deepEqual(recovered.children, emitted, "recovered tree = root + the emitted sections");
  assert.deepEqual({ ...recovered, children: [] }, { ...TREE, children: [] }, "root fields before children survive");
  assert.ok(validateAndNormalizeDesignTree(recovered).ok, "recovered tree validates");
  // Cuts at every position inside the 4th section recover the same 3 sections.
  const start4 = compact.indexOf('{"id":"frame-press"');
  const end4 = compact.indexOf('{"id":"frame-footer"');
  for (let at = start4; at < end4 - 1; at += 7) { // end4 - 2 is the 4th section's closing brace
    const p = createSectionStreamParser();
    p.push(compact.slice(0, at));
    assert.equal(JSON.parse(p.recover()!).children.length, 3, `cut at ${at}`);
  }
  assert.equal(createSectionStreamParser().recover(), null);
  console.log(`[proof] 3. truncated at ${cut}/${compact.length} chars: 3 sections kept, recovered tree agrees`);
}

function streamingRouter(content: string, finish = "stop", calls: any[] = []) {
  return {
    chat: {
      completions: {
        create: async (body: any) => {
          calls.push(body);
          if (!body.stream) {
            return { model: body.model, usage: { prompt_tokens: 10, completion_tokens: 10 }, choices: [{ message: { content }, finish_reason: finish }] };
          }
          const parts = chunks(content, 13, 23);
          return (async function* () {
            for (const part of parts) yield { model: body.model, choices: [{ index: 0, delta: { content: part }, finish_reason: null }] };
            yield { model: body.model, choices: [{ index: 0, delta: {}, finish_reason: finish }] };
            yield { model: body.model, choices: [], usage: { prompt_tokens: 900, completion_tokens: 400, prompt_tokens_details: { cached_tokens: 700 } } };
          })();
        },
      },
    },
  } as never;
}

async function testStreamedCallAndEngine() {
  const calls: any[] = [];
  setRouterForTesting(streamingRouter(FULL, "stop", calls));
  process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "proof-key";
  try {
    const deltas: string[] = [];
    const response = await tracedStreamCompletion("proof.stream", { model: "anthropic/claude-sonnet-4-6", messages: [{ role: "user", content: "x" }] }, (d) => deltas.push(d));
    assert.equal(response.choices[0]!.message.content, FULL);
    assert.equal(deltas.join(""), FULL);
    assert.equal(response.choices[0]!.finish_reason, "stop");
    assert.equal(calls[0].stream, true);

    // A client that answers a stream request with a full completion still works.
    setRouterForTesting({ chat: { completions: { create: async (body: any) => ({ model: body.model, usage: { prompt_tokens: 1, completion_tokens: 1 }, choices: [{ message: { content: FULL }, finish_reason: "stop" }] }) } } } as never);
    const pieces: string[] = [];
    const whole = await tracedStreamCompletion("proof.stream-fallback", { model: "m/x", messages: [{ role: "user", content: "x" }] }, (d) => pieces.push(d));
    assert.deepEqual([whole.choices[0]!.message.content, pieces.join("")], [FULL, FULL]);
    setRouterForTesting(streamingRouter(FULL, "stop", calls));
    const record = pendingModelCallRecords().filter((r) => r.step === "proof.stream").at(-1)!;
    assert.deepEqual([record.inputTokens, record.outputTokens, record.cachedInputTokens], [900, 400, 700], "usage from the final chunk reaches telemetry");

    // Real core: the base call streams when a section callback is given.
    const { generateV6DesignVariants } = await import("../lib/canvas/generate-design-core");
    calls.length = 0;
    const seen: string[] = [];
    await generateV6DesignVariants({ prompt: "Portfolio", tokens: (await import("../lib/agent/default-design-tokens")).defaultDesignTokens(), siteName: "Kiln", referenceUrls: [], fidelityMode: "balanced", onSection: (s: any) => seen.push(s.node.name) } as any).catch(() => undefined);
    const baseCall = calls.find((c) => JSON.stringify(c.messages).includes("## DesignNode Schema"));
    assert.equal(baseCall?.stream, true, `base generation call is streamed (${calls.length} calls)`);
    assert.ok(calls.filter((c) => c !== baseCall).every((c) => !c.stream), "other calls are not streamed");
    assert.deepEqual(seen, TREE.children.map((c) => c.name), "core reports each section as it streams");
  } finally {
    setRouterForTesting(null);
  }

  // Engine: sections land on the run as partial outputs, in order, with progress.
  const store = createMemoryRunStore(new Map());
  const deps = createEngineDeps({
    auth: {},
    projectId: "proj_live",
    store,
    overrides: {
      loadProjectState: async () => null,
      perceiveReference: async (ref) => ({ assetId: ref.id, composition: null, qualities: [], measured: { grid: null, type: null }, mode: "unknown", confidence: 0 }),
      analyzeImages: async () => ({ ok: false, status: 500, error: "n/a" }) as any,
      extractTaste: async () => ({ ok: false, status: 500, error: "n/a" }) as any,
      generateScreen: async (input: any) => {
        const parser = createSectionStreamParser({ onSection: input.onSection });
        for (const part of chunks(FULL, 21, 31)) parser.push(part);
        return { ok: true, siteName: "Kiln", generationResult: "v6", v6Debug: {} as any, variants: [{ id: "v", name: "Base", description: "", strategy: "safe", pageTree: TREE } as any] };
      },
    },
  });
  delete process.env.OPENROUTER_API_KEY;
  const input: EngineInput = { projectId: "proj_live", mode: "screen", target: "editor", prompt: "Portfolio for a ceramicist", references: [] };
  const runId = await store.create({ projectId: "proj_live", kind: "screen", input: input as any, stepKeys: [...ENGINE_STEPS] });
  const outcome = await executePipeline({ runId, input, deps });
  assert.equal(outcome.status, "complete", outcome.error ?? "");
  const run = (await store.get(runId))!;
  assert.deepEqual(partialSectionsFromRun(run), TREE.children, "run carries the sections in order");
  assert.deepEqual(run.progress.filter((p) => p.step === "section-ready").map((p) => p.detail), TREE.children.map((c) => c.name));
  assert.ok(progressLabels(run).includes("Building sections..."));
  const generateAt = run.progress.findIndex((p) => p.step === "generating");
  const firstSection = run.progress.findIndex((p) => p.step === "section-ready");
  const verifying = run.progress.findIndex((p) => p.step === "verifying");
  assert.ok(generateAt < firstSection && firstSection < verifying, "sections land during generate, before verify");
  console.log("[proof] 4. streamed call reassembles content + usage; core streams the base call; run lands 5 partial sections in order during generate");
}

async function testCanvasState() {
  const { canvasReducer } = await import("../lib/canvas/canvas-reducer");
  const { stripCanvasForPersistence } = await import("../lib/canvas/canvas-persistence");
  const { readFileSync } = await import("node:fs");
  let state: any = { items: [], prompt: { value: "", siteType: "auto", isOpen: true, history: [], isGenerating: false, agentSteps: [], generationResult: null }, history: { entries: [], cursor: -1, max: 50 }, updatedAt: "" };
  state = canvasReducer(state, { type: "SET_PROMPT_STATUS", isGenerating: true, agentSteps: ["Generating design..."] });
  state = canvasReducer(state, { type: "SET_PROMPT_STATUS", agentSteps: ["Building sections..."], liveSections: TREE.children.slice(0, 2) as any });
  assert.deepEqual(state.prompt.liveSections.map((s: any) => s.id), ["frame-hero", "frame-work"]);
  assert.equal(state.prompt.isGenerating, true);
  assert.equal(stripCanvasForPersistence(state).prompt.liveSections, undefined, "Live Build is never persisted");
  state = canvasReducer(state, { type: "SET_PROMPT_STATUS", isGenerating: false });
  assert.equal(state.prompt.liveSections, undefined, "finishing a generation clears the Live Build");
  const artboard = readFileSync("app/canvas-v1/components/CanvasArtboard.tsx", "utf8");
  assert.match(artboard, /<LiveBuildPreview sections=\{liveSections\}/);
  const preview = readFileSync("app/canvas-v1/components/live-build/LiveBuildPreview.tsx", "utf8");
  assert.match(preview, /aria-live="polite"/);
  assert.match(preview, /bg-\[#F5F5F0\]/);
  assert.doesNotMatch(preview, /gradient|animate-|shimmer|blur/, "flat placeholders, no shimmer");
  console.log("[proof] 5. canvas: liveSections are transient prompt state (set from run updates, cleared on finish, never persisted); artboard renders them with flat skeletons + a live region");
}

async function main() {
  testChunkedOrder();
  testFinalEqualsNonStreamed();
  testTruncation();
  await testStreamedCallAndEngine();
  await testCanvasState();
  console.log("stream-parse proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
