/**
 * Proof gate 1.4 — design briefs with per-reference roles, evidence and
 * conflict questions.
 *
 * 1. Opposite roles produce different directives (measured grid / type /
 *    palette follow the reference that owns each role, with provenance).
 * 2. A muted reference has zero influence: not perceived, not in the brief's
 *    conflicts or directives, not in generation inputs.
 * 3. A brief edit invalidates the derived taste cache: the pipeline reuses
 *    derived taste under the same brief, re-extracts when a role changes, and
 *    never re-extracts taste the designer set.
 * 4. Dark + light primaries trigger a mode question; a color-role owner or an
 *    answer resolves it; at most 3 questions.
 * 5. Every image in the perceive call is labelled "Image N · id · weight · role".
 *
 * Pixels are real (synthetic PNGs measured with sharp); vision calls are mocked.
 *
 * Run: npm run proof:intent-engine
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { setRouterForTesting } from "../lib/ai/model-router";
import { briefCacheKey, briefToDirectives, buildDesignBrief, type BriefReferenceInput } from "../lib/intent/brief";
import { MAX_QUESTIONS } from "../lib/intent/conflicts";
import { measureGrid, measurePalette, measureTypeScaleFromBoxes } from "../lib/intent/measure";
import { perceiveReference, type ReferencePerception } from "../lib/intent/perceive";
import { createEngineDeps } from "../lib/engine/deps";
import { executePipeline } from "../lib/engine/pipeline";
import { createMemoryRunStore } from "../lib/engine/run-store";
import { ENGINE_STEPS, type EngineDeps, type EngineInput, type EngineProjectState } from "../lib/engine/types";
import type { GenerateV6DesignVariantsInput } from "../lib/canvas/generate-design-core";
import type { IntentProfile } from "../types/intent-profile";

// ── Synthetic references ─────────────────────────────────────────────────────

/** Dark UI on a 12-column grid. */
function darkTwelveColumn(): string {
  const margin = 120;
  const gutter = 24;
  const col = (1440 - 2 * margin - 11 * gutter) / 12;
  const x = (i: number) => margin + i * (col + gutter);
  const band = (y: number, h: number, spans: Array<[number, number]>, fill: string) =>
    spans.map(([start, span]) => `<rect x="${x(start)}" y="${y}" width="${span * col + (span - 1) * gutter}" height="${h}" fill="${fill}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900">
    <rect width="1440" height="900" fill="#111214"/>
    ${band(40, 160, [[0, 12]], "#2A2C31")}
    ${band(240, 120, Array.from({ length: 12 }, (_, i) => [i, 1] as [number, number]), "#1C1D21")}
    ${band(400, 200, [[0, 4], [4, 4], [8, 4]], "#23252A")}
    ${band(640, 180, [[0, 8], [8, 4]], "#3DDC97")}
  </svg>`;
}

/** Light editorial page on a 3-column grid with a warm accent. */
function lightThreeColumn(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <rect width="1200" height="800" fill="#F5F0E8"/>
    ${[0, 1, 2].map((i) => `<rect x="${80 + i * 360}" y="80" width="320" height="420" fill="#FFFFFF"/>`).join("")}
    <rect x="80" y="560" width="1040" height="120" fill="#D9480F"/>
  </svg>`;
}

/** Muted: a loud magenta dark screenshot that must change nothing. */
function mutedLoud(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600">
    <rect width="1000" height="600" fill="#050505"/>
    <rect x="100" y="100" width="800" height="400" fill="#FF00AA"/>
  </svg>`;
}

const IMAGES: Record<string, Promise<Buffer>> = {};
function png(url: string): Promise<Buffer> {
  const svg = url.includes("dark") ? darkTwelveColumn() : url.includes("light") ? lightThreeColumn() : mutedLoud();
  return (IMAGES[url] ??= sharp(Buffer.from(svg)).png().toBuffer());
}

const typeScale = (ratio: number) => measureTypeScaleFromBoxes([0, 1, 2, 3, 4].map((n) => ({ heightPx: Math.round(12 * ratio ** n * 10) / 10 })));

function visionJson(url: string): string {
  const dark = url.includes("dark");
  return JSON.stringify({
    composition: {
      referenceType: dark ? "screenshot" : "editorial",
      keyCompositionalMove: dark ? "dense dashboard grid" : "oversized serif masthead",
      balance: "asymmetric",
      density: dark ? "rich" : "sparse",
      tension: "moderate",
    },
    qualities: [
      { dimension: "mood", label: dark ? "technical, nocturnal" : "calm, literary", evidence: [{ bbox: [0, 0, 1, 1] }], confidence: 0.8 },
      { dimension: "components", label: dark ? "data cards with mono labels" : "hairline-bordered cards", evidence: [{ bbox: [0.1, 0.4, 0.8, 0.3] }], confidence: 0.7 },
    ],
    appUi: dark ? { navigationModel: "sidebar", density: "compact", dataDisplay: ["cards"], controls: ["buttons"], iconography: "outline" } : null,
  });
}

let perceiveCalls: string[] = [];
async function perceive(ref: { id: string; url: string; weight?: any; roles?: string[] }, options: { measureType?: boolean } = {}) {
  perceiveCalls.push(ref.id);
  return perceiveReference(ref, options, {
    vision: async (r) => visionJson(r.url),
    measurePalette: async (url) => measurePalette(await png(String(url))),
    measureGrid: async (url) => measureGrid(await png(String(url))),
    measureType: async (url) => typeScale(url.includes("dark") ? 1.5 : 1.2),
  });
}

const REFS = {
  dark: { id: "ref-dark", url: "https://img.example/dark.png" },
  light: { id: "ref-light", url: "https://img.example/light.png" },
  muted: { id: "ref-muted", url: "https://img.example/muted.png" },
};

const intentProfile = {
  outputType: "marketing-site",
  businessGoal: "brand",
  confidence: 0.8,
  mustInclude: [],
  mustAvoid: [],
  referenceRoles: [],
  alternatives: [],
} as unknown as IntentProfile;

async function perceptionsFor(ids: Array<keyof typeof REFS>): Promise<Record<string, ReferencePerception>> {
  const out: Record<string, ReferencePerception> = {};
  for (const id of ids) out[REFS[id].id] = await perceive(REFS[id], { measureType: true });
  return out;
}

function brief(references: BriefReferenceInput[], perceptions: Record<string, ReferencePerception>, answers?: Record<string, string>) {
  return buildDesignBrief({ prompt: "Landing page", intentProfile, references, perceptions, answers });
}

// ── 1. Opposite roles → different directives ────────────────────────────────

async function testOppositeRoles() {
  const perceptions = await perceptionsFor(["dark", "light"]);
  assert.equal(perceptions["ref-dark"]!.mode, "dark");
  assert.equal(perceptions["ref-light"]!.mode, "light");
  assert.equal(perceptions["ref-dark"]!.measured.grid?.columns, 12);
  assert.equal(perceptions["ref-light"]!.measured.grid?.columns, 3);
  assert.ok(perceptions["ref-dark"]!.appUi, "app-UI vocabulary perceived");

  const a = brief([
    { id: "ref-dark", weight: "default", roles: ["layout"] },
    { id: "ref-light", weight: "default", roles: ["typography", "color"] },
  ], perceptions);
  const b = brief([
    { id: "ref-dark", weight: "default", roles: ["typography", "color"] },
    { id: "ref-light", weight: "default", roles: ["layout"] },
  ], perceptions);
  assert.deepEqual(a.references.map((r) => r.roleSource), ["explicit", "explicit"]);
  const da = briefToDirectives(a, perceptions);
  const db = briefToDirectives(b, perceptions);
  const find = (ds: typeof da, dim: string) => ds.find((d) => d.dimension === dim)!;

  assert.equal((find(da, "layout").value as any).columns, 12);
  assert.equal((find(db, "layout").value as any).columns, 3);
  assert.deepEqual(find(da, "layout").provenance.refIds, ["ref-dark"]);
  assert.deepEqual(find(db, "layout").provenance.refIds, ["ref-light"]);
  assert.equal(find(da, "layout").provenance.source, "measured");
  assert.equal((find(da, "typography").value as any).ratio, typeScale(1.2).ratio);
  assert.equal((find(db, "typography").value as any).ratio, typeScale(1.5).ratio);
  assert.match(find(da, "color").rule, /ref-light/);
  assert.match(find(db, "color").rule, /ref-dark/);
  assert.equal(find(da, "mode").value, "light", "mode follows the color owner");
  assert.equal(find(db, "mode").value, "dark");
  assert.notDeepEqual(da.map((d) => d.value), db.map((d) => d.value));
  for (const d of [...da, ...db]) assert.ok(d.provenance && typeof d.provenance.confidence === "number", `${d.dimension} has provenance`);
  assert.notEqual(briefCacheKey(a), briefCacheKey(b));
  console.log(`[proof] 1. opposite roles → different directives: layout ${find(da, "layout").value && (find(da, "layout").value as any).columns} vs ${(find(db, "layout").value as any).columns} cols, type ×${(find(da, "typography").value as any).ratio} vs ×${(find(db, "typography").value as any).ratio}, mode ${find(da, "mode").value} vs ${find(db, "mode").value}`);

  // Inferred roles come from perception + measurement when nothing is explicit.
  const inferred = brief([{ id: "ref-dark", weight: "default" }, { id: "ref-light", weight: "default" }], perceptions);
  assert.ok(inferred.references.every((r) => r.roleSource === "inferred"));
  assert.ok(inferred.references[0]!.roles.includes("layout"), `dark 12-col inferred as layout (${inferred.references[0]!.roles})`);
  // Annotation beats inference, explicit beats annotation.
  const annotated = brief([{ id: "ref-light", weight: "default", annotation: "love the typography" }], perceptions);
  assert.deepEqual([annotated.references[0]!.roles, annotated.references[0]!.roleSource], [["typography"], "annotation"]);
  const explicit = brief([{ id: "ref-light", weight: "default", annotation: "love the typography", roles: ["imagery"] }], perceptions);
  assert.deepEqual([explicit.references[0]!.roles, explicit.references[0]!.roleSource], [["imagery"], "explicit"]);
}

// ── 2. Muted reference → zero influence ─────────────────────────────────────

async function testMutedZeroInfluence() {
  const perceptions = await perceptionsFor(["dark", "light", "muted"]);
  const base: BriefReferenceInput[] = [
    { id: "ref-dark", weight: "default", roles: ["layout"] },
    { id: "ref-light", weight: "primary" },
  ];
  const without = brief(base, perceptions);
  const withMuted = brief([...base, { id: "ref-muted", weight: "muted", roles: ["color", "typography"] }], perceptions);
  assert.deepEqual(withMuted.references[2]!.roles, ["ignore"], "muted → ignore, even with explicit roles");
  assert.deepEqual(withMuted.conflicts, without.conflicts, "muted adds no conflicts");
  assert.deepEqual(withMuted.questions, without.questions, "muted adds no questions");
  assert.deepEqual(briefToDirectives(withMuted, perceptions), briefToDirectives(without, perceptions), "muted adds no directives");

  // Through the pipeline: never perceived, never in generation inputs.
  const run = async (references: EngineInput["references"]) => {
    perceiveCalls = [];
    const capture: GenerateV6DesignVariantsInput[] = [];
    const deps = pipelineDeps({ capture });
    await runPipeline(deps, references);
    return { calls: [...perceiveCalls], gen: JSON.parse(JSON.stringify(capture[0]!, (key, value) => (key === "analyzedAt" ? undefined : value))) };
  };
  const refs: EngineInput["references"] = [
    { ...REFS.light, weight: "primary" },
    { ...REFS.dark, weight: "default", roles: ["layout"] },
  ];
  const plain = await run(refs);
  const muted = await run([...refs, { ...REFS.muted, weight: "muted", roles: ["color"] }]);
  assert.ok(!muted.calls.includes("ref-muted"), "muted reference is not perceived");
  assert.deepEqual(muted.gen, plain.gen, "generation inputs identical with and without the muted reference");
  console.log("[proof] 2. muted reference: not perceived; brief conflicts, questions, directives and generation inputs unchanged");
}

// ── Pipeline harness with an in-memory derived-taste layer ─────────────────

type Memory = { derived: { profile: any; cacheKey: string | null } | null; extractions: number };

function pipelineDeps(opts: { memory?: Memory; capture?: GenerateV6DesignVariantsInput[] }): EngineDeps {
  const memory = opts.memory;
  const overrides: Partial<EngineDeps> = {
    loadProjectState: async (): Promise<EngineProjectState | null> =>
      memory?.derived ? { tasteProfile: memory.derived.profile, designTokens: null, tasteCacheKey: memory.derived.cacheKey } : null,
    saveDerivedTaste: async (profile, cacheKey) => {
      if (memory) memory.derived = { profile, cacheKey };
    },
    perceiveReference: (ref, options) => perceive(ref, options),
    analyzeImages: async () => ({ ok: false, status: 500, error: "not needed" }) as any,
    extractTaste: async (body: any) => {
      if (memory) memory.extractions++;
      return { ok: true, cached: false, profile: { summary: `extracted #${memory?.extractions ?? 0}`, roles: body.references.map((r: any) => r.role ?? null) } } as any;
    },
    generateScreen: async (input) => {
      opts.capture?.push(input);
      return {
        ok: true,
        siteName: "Proof",
        generationResult: "v6",
        v6Debug: { attempted: true } as any,
        variants: [{ id: "v", name: "Base", description: "", strategy: "safe", pageTree: {
          id: "root", type: "frame", name: "Page", style: { display: "flex", flexDirection: "column", width: 1440 },
          children: [{ id: "hero", type: "frame", name: "Hero", style: { display: "flex", flexDirection: "column" }, children: [{ id: "t", type: "text", name: "Title", style: { fontSize: 64 }, content: { text: "Studio" } }] }],
        } } as any],
      };
    },
  };
  return createEngineDeps({ auth: {}, projectId: "proj_intent", store: createMemoryRunStore(new Map()), overrides });
}

async function runPipeline(deps: EngineDeps, references: EngineInput["references"], answers?: Record<string, string>) {
  const input: EngineInput = { projectId: "proj_intent", mode: "screen", target: "editor", prompt: "Landing page for a studio", references, ...(answers ? { answers } : {}) };
  const runId = await deps.store.create({ projectId: input.projectId, kind: "screen", input: input as any, stepKeys: [...ENGINE_STEPS] });
  const outcome = await executePipeline({ runId, input, deps });
  assert.equal(outcome.status, "complete", outcome.error ?? "");
  const run = (await deps.store.get(runId))!;
  const checkpoint = (key: string) => JSON.parse((run.steps.find((s) => s.key === key)!.checkpoint as any).json);
  return { run, brief: checkpoint("buildBrief"), taste: checkpoint("compileTaste") };
}

// ── 3. Brief edit invalidates derived taste ─────────────────────────────────

async function testBriefEditInvalidates() {
  delete process.env.OPENROUTER_API_KEY; // intent classifier → deterministic heuristic
  const memory: Memory = { derived: null, extractions: 0 };
  const deps = pipelineDeps({ memory });
  const refs = (lightRole: "typography" | "color"): EngineInput["references"] => [
    { ...REFS.light, weight: "primary", roles: [lightRole] },
    { ...REFS.dark, weight: "default", roles: ["layout"] },
  ];

  const first = await runPipeline(deps, refs("typography"));
  assert.equal(first.taste.sources.tasteProfile, "extracted");
  assert.equal(memory.extractions, 1);
  assert.equal(memory.derived?.cacheKey, first.brief.cacheKey, "derived layer saved under the brief's cache key");
  assert.deepEqual(first.taste.tasteProfile.roles, ["typography", "layout"], "brief roles reach extraction");
  assert.ok(Array.isArray(first.brief.directives) && first.brief.directives.length > 0, "brief checkpoint carries directives");

  const same = await runPipeline(deps, refs("typography"));
  assert.equal(same.brief.cacheKey, first.brief.cacheKey);
  assert.equal(same.taste.sources.tasteProfile, "project", "same brief → derived taste reused");
  assert.equal(memory.extractions, 1);

  const edited = await runPipeline(deps, refs("color"));
  assert.notEqual(edited.brief.cacheKey, first.brief.cacheKey, "role edit changes the brief cache key");
  assert.equal(edited.taste.sources.tasteProfile, "extracted", "brief edit → derived taste re-extracted");
  assert.equal(memory.extractions, 2);
  assert.ok(edited.run.progress.some((p) => p.step === "taste-invalidated"));
  assert.deepEqual(edited.taste.tasteProfile.roles, ["palette", "layout"]);

  // Taste the designer set (no cache key) is never invalidated by a brief edit.
  memory.derived = { profile: { summary: "designer taste" }, cacheKey: null };
  const designer = await runPipeline(deps, refs("typography"));
  assert.equal(designer.taste.sources.tasteProfile, "project");
  assert.equal(designer.taste.tasteProfile.summary, "designer taste");
  assert.equal(memory.extractions, 2);
  console.log("[proof] 3. brief edit invalidates derived taste: same brief reused, role edit re-extracted, designer taste kept");
}

// ── 4. Mode conflicts → questions ───────────────────────────────────────────

async function testModeQuestion() {
  const perceptions = await perceptionsFor(["dark", "light"]);
  const primaries: BriefReferenceInput[] = [
    { id: "ref-dark", weight: "primary", roles: ["layout"] },
    { id: "ref-light", weight: "primary", roles: ["typography"] },
  ];
  const open = brief(primaries, perceptions);
  const mode = open.questions.find((q) => q.id === "conflict-mode");
  assert.ok(mode, `dark + light primaries ask about mode (${JSON.stringify(open.questions)})`);
  assert.deepEqual([...mode.options].sort(), ["dark", "light"]);
  assert.ok(open.questions.length <= MAX_QUESTIONS);
  assert.equal(briefToDirectives(open, perceptions).find((d) => d.dimension === "mode")?.hardness ?? "soft", "soft", "unresolved mode is never hard");

  const owned = brief([primaries[0]!, { ...primaries[1]!, roles: ["typography", "color"] }], perceptions);
  assert.ok(!owned.questions.some((q) => q.id === "conflict-mode"), "a color-role owner resolves the mode conflict");
  assert.equal(owned.conflicts.find((c) => c.dimension === "mode")?.resolution, "light");

  const answered = brief(primaries, perceptions, { "conflict-mode": "dark" });
  assert.equal(answered.conflicts.find((c) => c.dimension === "mode")?.resolution, "dark");
  const modeDirective = briefToDirectives(answered, perceptions).find((d) => d.dimension === "mode")!;
  assert.deepEqual([modeDirective.value, modeDirective.hardness, modeDirective.provenance.source], ["dark", "hard", "explicit"]);
  assert.notEqual(briefCacheKey(answered), briefCacheKey(open), "an answer changes the brief cache key");

  // Through the pipeline: questions surface as a progress event and on the brief.
  delete process.env.OPENROUTER_API_KEY;
  const piped = await runPipeline(pipelineDeps({}), [
    { ...REFS.dark, weight: "primary", roles: ["layout"] },
    { ...REFS.light, weight: "primary", roles: ["typography"] },
  ]);
  assert.ok(piped.brief.brief.questions.some((q: any) => q.id === "conflict-mode"));
  assert.ok(piped.run.progress.some((p) => p.step === "brief-questions"));
  console.log(`[proof] 4. dark + light primaries → "${mode.prompt}"; color owner or answer resolves it (hard, explicit)`);
}

// ── 5. Labels in every model call ───────────────────────────────────────────

async function testLabels() {
  const seen: any[] = [];
  process.env.OPENROUTER_API_KEY = "proof-key";
  setRouterForTesting({
    chat: {
      completions: {
        create: async (body: any) => {
          seen.push(body);
          return { model: "mock", choices: [{ message: { content: visionJson("dark") }, finish_reason: "stop" }] };
        },
      },
    },
  } as never);
  try {
    const perception = await perceiveReference(
      { id: "ref-dark", url: "https://img.example/dark.png", weight: "primary", roles: ["typography"] },
      {},
      { measurePalette: async () => measurePalette(await png("dark")), measureGrid: async () => measureGrid(await png("dark")) },
    );
    assert.ok(perception.composition, "perception parsed from the (mocked) vision call");
    assert.ok(perception.qualities.every((q) => q.evidence.length > 0), "every quality carries evidence bboxes");
    const parts = seen[0].messages[1].content as any[];
    const labelIndex = parts.findIndex((p) => p.type === "text" && p.text === "Image 1 · ref-dark · primary · role: typography");
    assert.ok(labelIndex >= 0, `label present (${JSON.stringify(parts.map((p) => p.text ?? p.type))})`);
    assert.equal(parts[labelIndex + 1].type, "image_url", "label immediately precedes its image");
  } finally {
    setRouterForTesting(null);
    delete process.env.OPENROUTER_API_KEY;
  }
  for (const file of ["lib/canvas/generate-design-core.ts", "lib/canvas/generate-screen-set-core.ts", "lib/canvas/design-taste-evaluator.ts", "lib/canvas/taste-evaluator.ts"]) {
    assert.match(readFileSync(file, "utf8"), /labeledReferenceBlocks\(/, `${file} labels its reference images`);
  }
  assert.match(readFileSync("lib/canvas/taste-extract-inputs.ts", "utf8"), /labeledImageBlocks\(/);
  console.log('[proof] 5. images labelled in model calls: "Image 1 · ref-dark · primary · role: typography"');
}

async function main() {
  await testOppositeRoles();
  await testMutedZeroInfluence();
  await testBriefEditInvalidates();
  await testModeQuestion();
  await testLabels();
  console.log("intent-engine proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
