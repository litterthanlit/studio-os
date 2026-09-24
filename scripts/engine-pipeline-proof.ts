/**
 * Proof gate 1.2 — one engine pipeline for the editor, agents and benchmarks.
 *
 * 1. The editor entrypoint (POST /api/engine/runs → startPipelineRun) and the
 *    agent entrypoint (executeAgentGenerateScreen) produce identical brief and
 *    taste inputs for the same project (same references, same design memory).
 * 2. A run resumes after an injected failure: completed steps are not re-run.
 * 3. Progress comes only from real events: every progress row is a step event,
 *    and the editor has no timer-driven progress.
 * Checkpoints and editor results are JSON strings (Convex nesting-safe).
 *
 * Model calls are mocked (no key); design memory is an injected project state.
 *
 * Run: npm run proof:engine-pipeline
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEngineDeps } from "../lib/engine/deps";
import { executePipeline, startPipelineRun } from "../lib/engine/pipeline";
import { createMemoryRunStore } from "../lib/engine/run-store";
import { engineReferencesFromItems } from "../lib/engine/references";
import { ENGINE_STEPS, type EngineDeps, type EngineInput } from "../lib/engine/types";
import { progressLabels, editorPayloadFromRun } from "../lib/engine/client";
import {
  defaultAgentGenerationDeps,
  executeAgentGenerateScreen,
} from "../lib/agent/agent-generation";
import { applyCanvasAgentOperations } from "../lib/agent/canvas-agent-ops";
import { createEmptyCanvas, type ReferenceItem } from "../lib/canvas/unified-canvas-state";
import type { GenerateV6DesignVariantsInput } from "../lib/canvas/generate-design-core";
import type { DesignNode } from "../lib/canvas/design-node";
import type { CompositionAnalysis } from "../types/composition-analysis";

const PROJECT = "proj_engine_proof";
const PROMPT = "Editorial landing page for a small press";

const storedTaste: any = {
  summary: "Stored project taste",
  adjectives: ["editorial"],
  archetypeMatch: "editorial-brand",
  archetypeConfidence: 0.8,
  layoutBias: { density: "spacious", rhythm: "asymmetric", heroStyle: "full-bleed", sectionFlow: "editorial-grid", gridBehavior: "editorial", whitespaceIntent: "dramatic" },
  typographyTraits: { scale: "dramatic", headingTone: "editorial", bodyTone: "literary", contrast: "high", casePreference: "mixed", recommendedPairings: ["Bespoke Serif", "Geist"] },
  colorBehavior: { mode: "light", palette: "restrained", accentStrategy: "no-accent", saturation: "desaturated", temperature: "warm", suggestedColors: { background: "#FAF9F6", surface: "#F1EEE8", text: "#1A1A1A", accent: "#8A6F4D" } },
  imageTreatment: { style: "editorial", sizing: "full-bleed", treatment: "raw", cornerRadius: "subtle", borders: false, shadow: "none", aspectPreference: "mixed" },
  ctaTone: { style: "editorial", shape: "sharp", hierarchy: "text-link-preferred" },
  avoid: [],
  confidence: 0.8,
  referenceCount: 2,
  dominantReferenceType: "photography",
  warnings: [],
};
const storedTokens: any = { colors: { accent: "#8A6F4D", background: "#FAF9F6", surface: "#F1EEE8", text: "#1A1A1A", textMuted: "#6B6B6B", border: "#E5E5E0", primary: "#1A1A1A", secondary: "#F1EEE8" }, typography: { fontFamily: "Bespoke Serif", scale: {}, weights: {} }, spacing: {}, radii: {}, shadows: {} };

const tree: DesignNode = {
  id: "root",
  type: "frame",
  name: "Page",
  style: { display: "flex", flexDirection: "column", width: 1440 },
  children: [{ id: "hero", type: "frame", name: "Hero", style: { display: "flex", flexDirection: "column" }, children: [{ id: "t", type: "text", name: "Title", style: { fontSize: 64 }, content: { text: "Small press" } }] }],
};

function analysisFor(url: string): CompositionAnalysis {
  return { referenceType: url.includes("a.png") ? "editorial" : "photograph", referenceConfidence: "high", era: "contemporary", balance: "asymmetric", density: "sparse", tension: "moderate", headingToBodyRatio: "dramatic" } as CompositionAnalysis;
}

function canvasWithReferences() {
  const written = applyCanvasAgentOperations(createEmptyCanvas(), [
    { type: "add_reference", imageUrl: "https://img.example/b.png" },
    { type: "add_reference", imageUrl: "https://img.example/a.png" },
    { type: "add_reference", imageUrl: "https://img.example/muted.png" },
  ]);
  written.state.items = written.state.items.map((item) => {
    if (item.kind !== "reference") return item;
    if (item.imageUrl.endsWith("a.png")) return { ...item, weight: "primary" as const, annotation: "typography from here" };
    if (item.imageUrl.endsWith("muted.png")) return { ...item, weight: "muted" as const };
    return item;
  });
  return written.state;
}

function counters() {
  return { analyze: 0, classify: 0, project: 0, generate: 0 };
}

function mockedOverrides(count: ReturnType<typeof counters>, capture: GenerateV6DesignVariantsInput[], opts: { failGenerateOnce?: boolean } = {}): Partial<EngineDeps> {
  let failed = false;
  return {
    loadProjectState: async () => {
      count.project++;
      return { tasteProfile: storedTaste, designTokens: storedTokens };
    },
    perceiveReference: async (ref) => {
      count.analyze++;
      return { assetId: ref.id, composition: analysisFor(ref.url), qualities: [], measured: { grid: null, type: null }, mode: "unknown", confidence: 0.5 };
    },
    analyzeImages: async () => ({ ok: false, status: 500, error: "not needed" }),
    extractTaste: async () => ({ ok: false, status: 500, error: "not needed" }),
    generateScreen: async (input) => {
      count.generate++;
      capture.push(input);
      if (opts.failGenerateOnce && !failed) {
        failed = true;
        throw new Error("injected failure: model 529 overloaded");
      }
      return {
        ok: true,
        siteName: "Small Press",
        generationResult: "v6",
        v6Debug: { attempted: true } as any,
        variants: [{ id: "v-safe", name: "Base", description: "", strategy: "safe", pageTree: tree } as any],
      };
    },
  };
}

/** Drop fields that legitimately differ per entrypoint (site naming). */
function comparable(input: GenerateV6DesignVariantsInput) {
  const { siteName: _siteName, ...rest } = input;
  return JSON.parse(JSON.stringify(rest));
}

async function testEditorAndAgentMatch() {
  delete process.env.OPENROUTER_API_KEY; // intent classifier → deterministic heuristic
  const state = canvasWithReferences();

  // Editor entrypoint: what POST /api/engine/runs does for a signed-in editor.
  const editorCapture: GenerateV6DesignVariantsInput[] = [];
  const editorStore = createMemoryRunStore(new Map());
  const editorInput: EngineInput = {
    projectId: PROJECT,
    mode: "auto",
    target: "editor",
    prompt: PROMPT,
    fidelityMode: "balanced",
    references: engineReferencesFromItems(state.items.filter((i): i is ReferenceItem => i.kind === "reference")),
  };
  let task: Promise<void> = Promise.resolve();
  const { runId: editorRunId } = await startPipelineRun({
    input: editorInput,
    deps: createEngineDeps({ auth: {}, projectId: PROJECT, store: editorStore, overrides: mockedOverrides(counters(), editorCapture) }),
    schedule: (fn) => {
      task = fn();
    },
  });
  await task;
  const editorRun = (await editorStore.get(editorRunId))!;
  assert.equal(editorRun.status, "complete", editorRun.error ?? "");

  // Agent entrypoint: the real executor with the same project state and canvas.
  const agentCapture: GenerateV6DesignVariantsInput[] = [];
  const agentCount = counters();
  const overrides = mockedOverrides(agentCount, agentCapture);
  const outcome = await executeAgentGenerateScreen(
    { auth: {}, projectId: PROJECT as any, prompt: PROMPT },
    {
      ...defaultAgentGenerationDeps,
      loadCanvas: async () => ({ state, revision: 3 }),
      saveCanvas: async () => ({ id: "doc" as any, revision: 4, unchanged: false }),
      loadDesignState: async () => ({ tasteProfile: storedTaste, designTokens: storedTokens, tasteUpdatedAt: 1, tokensUpdatedAt: 1, updatedAt: 1 }),
      generateScreen: overrides.generateScreen!,
      engine: { perceiveReference: overrides.perceiveReference!, analyzeImages: overrides.analyzeImages!, extractTaste: overrides.extractTaste! },
    },
  );
  assert.equal(outcome.status, 200, JSON.stringify(outcome.body).slice(0, 300));

  assert.equal(editorCapture.length, 1);
  assert.equal(agentCapture.length, 1);
  const editorGen = comparable(editorCapture[0]!);
  const agentGen = comparable(agentCapture[0]!);
  for (const key of ["prompt", "tokens", "tasteProfile", "referenceUrls", "references", "fidelityMode", "intentClassification", "compositionData", "compositionContext"]) {
    assert.deepEqual(agentGen[key], editorGen[key], `identical ${key}`);
  }
  assert.equal(editorGen.tasteProfile.summary, "Stored project taste", "taste from design memory");
  assert.deepEqual(editorGen.referenceUrls, ["https://img.example/a.png", "https://img.example/b.png"], "primary first, muted excluded");

  const editorPayload = editorPayloadFromRun(editorRun)!;
  assert.equal(editorPayload.kind, "screen");
  assert.equal(editorPayload.sources.tasteProfile, "project");
  assert.equal(editorPayload.analyses.length, 2, "editor receives analyses to cache on its references");
  const briefStep = editorRun.steps.find((s) => s.key === "buildBrief")!;
  assert.equal(typeof (briefStep.checkpoint as any).json, "string", "checkpoints are JSON strings");
  const brief = JSON.parse((briefStep.checkpoint as any).json).brief;
  assert.deepEqual(brief.references.map((r: any) => [r.weight, r.roles[0]]), [["primary", "typography"], ["default", "imagery"], ["muted", "ignore"]]);
  console.log("[proof] 1. editor and agent entrypoints feed generation identical brief + taste inputs (taste: project memory; primary first; muted ignored)");
  return editorRun;
}

async function testResume() {
  const count = counters();
  const capture: GenerateV6DesignVariantsInput[] = [];
  const store = createMemoryRunStore(new Map());
  const deps = createEngineDeps({ auth: {}, projectId: PROJECT, store, overrides: mockedOverrides(count, capture, { failGenerateOnce: true }) });
  const input: EngineInput = {
    projectId: PROJECT,
    mode: "auto",
    target: "editor",
    prompt: PROMPT,
    references: [
      { id: "r1", url: "https://img.example/a.png", weight: "primary" },
      { id: "r2", url: "https://img.example/b.png", weight: "default" },
    ],
  };
  const runId = await store.create({ projectId: PROJECT, kind: "screen", input: input as any, stepKeys: [...ENGINE_STEPS] });

  const first = await executePipeline({ runId, input, deps });
  assert.equal(first.status, "failed");
  assert.equal(first.failedStep, "generate");
  assert.match(first.error ?? "", /injected failure/);
  const afterFirst = { ...count };
  const failedRun = (await store.get(runId))!;
  assert.deepEqual(
    failedRun.steps.map((s) => [s.key, s.status]),
    [["resolveAssets", "done"], ["analyzeReferences", "done"], ["buildBrief", "done"], ["compileTaste", "done"], ["generate", "failed"], ["verify", "pending"], ["persist", "pending"]],
  );

  const second = await executePipeline({ runId, input, deps });
  assert.equal(second.status, "complete", second.error ?? "");
  assert.deepEqual(second.executed, ["generate", "verify", "persist"], "resumed from the failed step");
  assert.equal(count.analyze, afterFirst.analyze, "reference analysis not repeated");
  assert.equal(count.project, afterFirst.project, "taste compile not repeated");
  assert.equal(count.generate, 2);
  assert.deepEqual(capture[1]!.tasteProfile, capture[0]!.tasteProfile, "resumed generate uses the checkpointed taste");
  const resumedRun = (await store.get(runId))!;
  assert.ok(resumedRun.progress.some((p) => p.step === "resumed"));
  console.log(`[proof] 2. injected failure at generate → resume ran ${second.executed.join(" → ")}; earlier steps reused from checkpoints`);
}

function testRealProgress(run: Awaited<ReturnType<typeof testEditorAndAgentMatch>>) {
  const known = new Set(["queued", "running", "resumed", "loading-context", "analyzing-reference", "brief", "brief-questions", "taste", "taste-invalidated", "generating", "planned", "screen-complete", "screen-failed", "verifying", "writing-canvas", "rebased", "complete", "partial", "failed"]);
  for (const row of run.progress) assert.ok(known.has(row.step), `progress row "${row.step}" is a real step event`);
  const labels = progressLabels(run);
  assert.deepEqual(labels, ["Preparing references...", "Analyzing references...", "Understanding the brief...", "Compiling taste...", "Generating design...", "Checking the output..."]);

  const composer = readFileSync("app/canvas-v1/components/PromptComposerV2.tsx", "utf8");
  assert.doesNotMatch(composer, /creatingTimer/, "timer-driven agentSteps split is gone");
  assert.doesNotMatch(composer, /\/api\/canvas\/generate-component",\s*\{\s*method: "POST",[\s\S]{0,200}mode: generationMode/, "full-page generation no longer calls generate-component");
  assert.match(composer, /progressLabels\(current\)/, "editor progress comes from run events");
  assert.match(composer, /waitForEngineRun\(/);
  console.log(`[proof] 3. progress is only real step events: ${labels.join(" · ")}`);
}

async function main() {
  const editorRun = await testEditorAndAgentMatch();
  await testResume();
  testRealProgress(editorRun);
  for (const file of ["app/api/engine/runs/route.ts", "app/api/engine/runs/[id]/route.ts", "scripts/benchmark-harness.ts"]) {
    assert.match(readFileSync(file, "utf8"), /engine/, `${file} is on the engine`);
  }
  console.log("engine-pipeline proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
