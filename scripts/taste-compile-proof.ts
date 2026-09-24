/**
 * Proof gate 1.5 — layered taste compile with provenance.
 *
 * 1. Legacy profiles produce unchanged prompt text: the directive text matches
 *    golden snapshots taken from the compiler as it was before 1.5 (legacy and
 *    layered entrypoints) and is embedded verbatim in the design prompt, which
 *    is identical through both entrypoints.
 * 2. Every directive carries provenance (legacy and layered, all fidelities).
 * 3. HARD numeric directives only from measured values above the confidence
 *    threshold (or explicit overrides); the headingToBodyRatio type scale is a
 *    labelled SOFT fallback.
 * 4. The archetype is a hint: bans become SOFT, knob presets weigh by confidence.
 * 5. Learned preferences apply in scope only; explicit beats learned.
 * 6. Measured colors refine tokens; the engine checkpoints the layered input
 *    and generation receives it.
 *
 * Run: npm run proof:taste-compile
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compileTasteToDirectives, directivesToPromptText, type CompiledDirectives } from "../lib/canvas/directive-compiler";
import { buildDesignTreePrompt } from "../lib/canvas/design-tree-prompt";
import { deriveDesignKnobs } from "../lib/canvas/design-knobs";
import { deriveTasteStructureFromCompositions } from "../lib/canvas/composition-blueprint";
import { defaultDesignTokens } from "../lib/agent/default-design-tokens";
import { compileLayeredDirectives, compileLayeredTaste, HARD_CONFIDENCE, layeredKnobOptions, layeredTokens, type LearnedRule } from "../lib/taste/compile";
import type { BriefDirective } from "../lib/intent/brief";
import { createEngineDeps } from "../lib/engine/deps";
import { executePipeline } from "../lib/engine/pipeline";
import { createMemoryRunStore } from "../lib/engine/run-store";
import { ENGINE_STEPS, type EngineInput } from "../lib/engine/types";
import { LEGACY_PROFILES } from "./fixtures/legacy-taste-profiles";

const golden = JSON.parse(readFileSync("scripts/fixtures/legacy-taste-prompts.json", "utf8")) as Record<string, string>;
const FIDELITIES = ["close", "balanced", "push"] as const;

function all(d: CompiledDirectives) {
  return [...d.hard, ...d.soft, ...d.avoid];
}

function testLegacyUnchanged() {
  let compared = 0;
  for (const [name, profile] of Object.entries(LEGACY_PROFILES)) {
    const layered = compileLayeredTaste({ derived: profile });
    for (const fidelity of FIDELITIES) {
      for (const appScreen of [false, true]) {
        const key = `${name}/${fidelity}/${appScreen ? "app" : "page"}/directives`;
        assert.equal(directivesToPromptText(compileTasteToDirectives(profile, fidelity, { appScreen })), golden[key], `${key} (legacy entrypoint)`);
        assert.equal(directivesToPromptText(compileLayeredDirectives(layered, fidelity, { appScreen })), golden[key], `${key} (layered entrypoint)`);
        compared += 2;
      }
      const tokens = defaultDesignTokens();
      const args = ["Landing page for a small press", "Small Press"] as const;
      const legacyPrompt = buildDesignTreePrompt(tokens, ...args, { tasteProfile: profile, fidelityMode: fidelity });
      assert.equal(buildDesignTreePrompt(tokens, ...args, { layeredTaste: layered, fidelityMode: fidelity }), legacyPrompt, `${name}/${fidelity}: layered prompt = legacy prompt`);
      assert.ok(legacyPrompt.includes(golden[`${name}/${fidelity}/page/directives`]!), `${name}/${fidelity}: pre-1.5 directive text embedded verbatim in the prompt`);
      compared += 2;
    }
  }
  console.log(`[proof] 1. legacy profiles: ${compared} directive texts byte-identical to the pre-1.5 snapshots; layered prompt = legacy prompt`);
}

function assertProvenance(d: CompiledDirectives, label: string) {
  for (const directive of all(d)) {
    assert.ok(directive.provenance, `${label}: [${directive.dimension}] has provenance`);
    assert.ok(["measured", "perceived", "explicit", "learned", "fallback"].includes(directive.provenance.source));
    assert.equal(typeof directive.provenance.confidence, "number");
  }
}

const measuredDirectives = (typeConfidence: number): BriefDirective[] => [
  { dimension: "layout", rule: "Use a 12-column grid with 24px gutters and 120px outer margins (measured at 1440px)", value: { columns: 12, gutter: 24, margin: 120, width: 1440 }, hardness: "hard", provenance: { source: "measured", refIds: ["ref-a"], confidence: 1 } },
  { dimension: "typography", rule: "Type scale ratio 1.333 (perfect fourth); sizes step by ×1.333", value: { ratio: 1.333, sizes: [16, 21, 28, 38, 50] }, hardness: typeConfidence >= 0.6 ? "hard" : "soft", provenance: { source: "measured", refIds: ["ref-b"], confidence: typeConfidence } },
  { dimension: "color", rule: "Palette measured from ref-b: background #F5F0E8 (64%), text #1A1A1A (8%), accent #D9480F (10%)", value: [{ hex: "#F5F0E8", role: "background", area: 0.64 }, { hex: "#1A1A1A", role: "text", area: 0.08 }, { hex: "#D9480F", role: "accent", area: 0.1 }], hardness: "hard", provenance: { source: "measured", refIds: ["ref-b"], confidence: 0.9 } },
  { dimension: "mode", rule: "Color mode: light", value: "light", hardness: "soft", provenance: { source: "measured", refIds: ["ref-b"], confidence: 0.8 } },
  { dimension: "mood", rule: "mood from ref-a: calm, literary", value: ["calm, literary"], hardness: "soft", provenance: { source: "perceived", refIds: ["ref-a"], confidence: 0.6 } },
];

function testProvenanceEverywhere() {
  for (const [name, profile] of Object.entries(LEGACY_PROFILES)) {
    for (const fidelity of FIDELITIES) {
      for (const appScreen of [false, true]) {
        assertProvenance(compileTasteToDirectives(profile, fidelity, { appScreen }), `${name}/${fidelity}/legacy`);
        const layered = compileLayeredTaste({
          derived: profile,
          briefDirectives: measuredDirectives(0.8),
          learned: [{ id: "p1", dimension: "ctaTone", rule: "CTAs are text links", value: "text-link", scope: { level: "user" }, confidence: 0.7 }],
        });
        assertProvenance(compileLayeredDirectives(layered, fidelity, { appScreen }), `${name}/${fidelity}/layered`);
      }
    }
  }
  const overrides = compileTasteToDirectives(LEGACY_PROFILES.saasOverrides, "balanced");
  assert.equal(overrides.hard.find((d) => d.dimension === "headingFont")?.provenance?.source, "explicit");
  console.log("[proof] 2. every directive carries provenance (legacy + layered, 3 fidelities, page + app)");
}

function testHardOnlyFromMeasured() {
  const profile = LEGACY_PROFILES.editorial;
  const hardDims = (d: CompiledDirectives) => d.hard.map((x) => x.dimension);

  const measured = compileLayeredDirectives(compileLayeredTaste({ derived: profile, briefDirectives: measuredDirectives(0.8) }), "close");
  const grid = measured.hard.find((d) => d.dimension === "grid");
  assert.ok(grid && grid.provenance?.source === "measured", "measured grid is HARD");
  const type = measured.hard.find((d) => d.dimension === "typeScale");
  assert.ok(type && type.provenance?.source === "measured", "measured type scale (≥ threshold) is HARD");
  assert.equal(measured.hard.filter((d) => d.dimension === "typeScale").length + measured.soft.filter((d) => d.dimension === "typeScale").length, 1, "measured type scale replaces the perceived one");
  assert.ok(measured.hard.find((d) => d.dimension === "palette")?.rule.includes("measured"), "measured palette replaces the perceived palette");
  for (const d of measured.hard) {
    if (["typeScale", "spacingSystem", "cornerRadius", "density", "grid"].includes(d.dimension)) {
      assert.ok(d.provenance!.source === "measured" && d.provenance!.confidence >= HARD_CONFIDENCE || d.provenance!.source === "explicit", `HARD numeric [${d.dimension}] is measured ≥ ${HARD_CONFIDENCE} or explicit (${d.provenance!.source})`);
    }
  }
  for (const dim of ["spacingSystem", "cornerRadius", "density"]) {
    assert.ok(!hardDims(measured).includes(dim), `perceived ${dim} is SOFT in the layered compile`);
    assert.ok(measured.soft.some((d) => d.dimension === dim), `perceived ${dim} kept as SOFT`);
  }
  assert.ok(measured.soft.some((d) => d.dimension === "colorMode" && d.provenance?.source === "measured"), "measured mode (soft brief directive) replaces perceived mode");

  const lowConfidence = compileLayeredDirectives(compileLayeredTaste({ derived: profile, briefDirectives: measuredDirectives(0.5) }), "close");
  assert.ok(!hardDims(lowConfidence).includes("typeScale"), "measured type scale below the threshold is SOFT");

  // Explicit density stays HARD.
  const explicit = compileLayeredDirectives(compileLayeredTaste({ derived: LEGACY_PROFILES.saasOverrides, briefDirectives: measuredDirectives(0.8) }), "balanced");
  assert.equal(explicit.hard.find((d) => d.dimension === "density")?.provenance?.source, "explicit");
  assert.ok(explicit.hard.some((d) => d.dimension === "palette" && d.provenance?.source === "explicit"), "explicit palette beats measured");
  assert.ok(!explicit.hard.some((d) => d.dimension === "palette" && d.provenance?.source === "measured"));

  // mapTypeScale → labelled SOFT fallback.
  const structure = deriveTasteStructureFromCompositions([{ analysis: { headingToBodyRatio: "dramatic", density: "sparse", spacingSystem: "8px-grid" } as any, weight: "primary", referenceIndex: 0 }]);
  assert.equal(structure.typeScaleSource, "fallback");
  const fallback = compileTasteToDirectives({ ...profile, ...structure }, "close");
  assert.ok(!fallback.hard.some((d) => d.dimension === "typeScale"), "fallback type scale is not HARD");
  const soft = fallback.soft.find((d) => d.dimension === "typeScale")!;
  assert.match(soft.rule, /Approximate type sizes \(estimated from the reference's heading-to-body ratio, not measured\)/);
  assert.equal(soft.provenance?.source, "fallback");

  // A measured type scale also lands on the profile (so knobs / validators see it).
  const layeredProfile = compileLayeredTaste({ derived: { ...profile, ...structure }, briefDirectives: measuredDirectives(0.8) }).tasteProfile!;
  assert.deepEqual([layeredProfile.typeScale, layeredProfile.typeScaleSource], [{ body: 16, heading: 28, display: 50 }, "measured"]);
  console.log("[proof] 3. HARD numeric only from measured ≥ 0.7 or explicit; perceived spacing/radius/density SOFT; ratio-derived type scale is a labelled SOFT fallback");
}

function testArchetypeHint() {
  const profile = { ...LEGACY_PROFILES.editorial, archetypeMatch: "editorial-brand", archetypeConfidence: 0.3 };
  const legacy = compileTasteToDirectives(profile, "balanced");
  const layered = compileLayeredDirectives(compileLayeredTaste({ derived: profile, briefDirectives: measuredDirectives(0.8) }), "balanced");
  assert.ok(legacy.hard.some((d) => d.dimension === "bannedNodeTypes"), "legacy: editorial-brand bans are HARD");
  assert.ok(!layered.hard.some((d) => d.dimension === "bannedNodeTypes"), "layered: archetype bans are not HARD");
  assert.match(layered.soft.find((d) => d.dimension === "bannedNodeTypes")!.rule, /Archetype hint \(editorial-brand, confidence 0\.30\)/);
  const knobs = (weight?: number) => deriveDesignKnobs({ tasteProfile: null, ...(weight === undefined ? {} : { archetypeWeight: weight }) });
  const base = knobs(0);
  const full = knobs();
  const options = layeredKnobOptions(compileLayeredTaste({ derived: profile, briefDirectives: measuredDirectives(0.8) }));
  assert.equal(options.archetypeWeight, 0.3, "knob preset weight = archetype confidence");
  const weak = knobs(0.3);
  assert.deepEqual(knobs(1), full, "weight 1 = legacy preset");
  let moved = 0;
  for (const section of ["layout", "typography", "color", "imagery", "components", "content"] as const) {
    for (const [key, value] of Object.entries(full[section])) {
      const b = (base[section] as any)[key];
      if (typeof value !== "number" || typeof b !== "number") continue;
      assert.ok(Math.abs((weak[section] as any)[key] - (b + (value - b) * 0.3)) < 1e-9, `${section}.${key} interpolates base → preset by 0.3`);
      if (value !== b) moved++;
    }
  }
  assert.ok(moved > 0, "the preset differs from the base on some knobs");
  assert.deepEqual(layeredKnobOptions(compileLayeredTaste({ derived: profile })), {}, "legacy → preset applies fully");
  console.log("[proof] 4. archetype is a hint: bans SOFT with confidence, knob preset weighted by archetype confidence");
}

function testLearnedScope() {
  const profile = LEGACY_PROFILES.saasOverrides; // explicit headingFont "Inter Display"
  const rules: LearnedRule[] = [
    { id: "p-user", dimension: "ctaTone", rule: "CTA tone: understated text links", value: "text-link", scope: { level: "user" }, confidence: 0.8 },
    { id: "p-proj", dimension: "bodyFont", rule: "Body font MUST be: Söhne", value: "Söhne", scope: { level: "project", targetId: "proj_a" }, confidence: 0.9 },
    { id: "p-other", dimension: "shadow", rule: "Shadow treatment: none", value: "none", scope: { level: "project", targetId: "proj_b" }, confidence: 0.9 },
    { id: "p-screen", dimension: "whitespace", rule: "Whitespace intent: dramatic", value: "dramatic", scope: { level: "screen", targetId: "screen-1" }, confidence: 0.7 },
    { id: "p-node", dimension: "heroStyle", rule: "Hero style: split", value: "split", scope: { level: "node", targetId: "n1" }, confidence: 0.9 },
    { id: "p-font", dimension: "headingFont", rule: "Heading font MUST be: Canela", value: "Canela", scope: { level: "user" }, confidence: 0.9 },
    { id: "p-avoid", dimension: "avoid", rule: "avoid", value: "use emoji", scope: { level: "user" }, confidence: 0.9 },
    { id: "p-knob", dimension: "knobs", rule: "rounder components", value: { components: { shadowDepth: 0.9 } }, scope: { level: "user" }, confidence: 0.9 },
  ];
  const layered = compileLayeredTaste({ derived: profile, learned: rules, scope: { projectId: "proj_a" } });
  assert.deepEqual(layered.learned.map((r) => r.id).sort(), ["p-avoid", "p-font", "p-knob", "p-proj", "p-user"], "project/user rules in scope; other project, screen (no screen) and node excluded");
  const withScreen = compileLayeredTaste({ derived: profile, learned: rules, scope: { projectId: "proj_a", screenId: "screen-1" } });
  assert.ok(withScreen.learned.some((r) => r.id === "p-screen"), "screen rule applies on its screen");

  const d = compileLayeredDirectives(layered, "balanced");
  const find = (dim: string) => all(d).filter((x) => x.dimension === dim);
  assert.equal(find("headingFont").length, 1);
  assert.equal(find("headingFont")[0]!.provenance?.source, "explicit", "explicit heading font beats learned");
  assert.equal(find("bodyFont")[0]!.provenance?.preferenceId, "p-proj", "learned body font replaces perceived");
  assert.ok(d.hard.some((x) => x.dimension === "bodyFont" && x.provenance?.source === "learned"));
  assert.ok(find("ctaTone").every((x) => x.provenance?.source === "learned"), "learned ctaTone replaces perceived");
  assert.ok(d.avoid.some((x) => x.value === "use emoji" && x.provenance?.preferenceId === "p-avoid"));
  const knobs = deriveDesignKnobs({ tasteProfile: layered.tasteProfile, ...layeredKnobOptions(layered) });
  assert.equal(knobs.components.shadowDepth, 0.9, "learned knob patch applied");
  assert.equal(knobs.components.radius, 0.1, "explicit knob override still wins");
  console.log("[proof] 5. learned preferences: in-scope only (user/project/screen; not node or other projects); explicit beats learned; avoid + knobs applied");
}

async function testTokensAndEngine() {
  const tokens = defaultDesignTokens();
  const layered = compileLayeredTaste({ derived: LEGACY_PROFILES.editorial, briefDirectives: measuredDirectives(0.8) });
  const refined = layeredTokens(tokens, layered);
  assert.deepEqual([refined.colors.background, refined.colors.text, refined.colors.accent], ["#F5F0E8", "#1A1A1A", "#D9480F"]);
  assert.equal(refined.colors.border, tokens.colors.border);
  assert.deepEqual(layeredTokens(tokens, compileLayeredTaste({ derived: LEGACY_PROFILES.saasOverrides, briefDirectives: measuredDirectives(0.8) })), tokens, "explicit palette → tokens untouched");

  const prompt = buildDesignTreePrompt(refined, "Landing page", "Press", { layeredTaste: layered, fidelityMode: "balanced" });
  const hardSection = prompt.split("### HARD CONSTRAINTS")[1]!.split("###")[0]!;
  assert.match(hardSection, /\[grid\] Use a 12-column grid/);

  // Engine: compileTaste checkpoints the layered input with learned rules; generate receives it.
  delete process.env.OPENROUTER_API_KEY;
  const captured: any[] = [];
  const deps = createEngineDeps({
    auth: {},
    projectId: "proj_a",
    store: createMemoryRunStore(new Map()),
    overrides: {
      loadProjectState: async () => ({ tasteProfile: LEGACY_PROFILES.editorial, designTokens: null }),
      loadLearned: async () => [{ id: "p-user", dimension: "ctaTone", rule: "CTA tone: text links", value: "text-link", scope: { level: "user" }, confidence: 0.8 }],
      perceiveReference: async (ref) => ({ assetId: ref.id, composition: null, qualities: [], measured: { grid: null, type: null }, mode: "unknown", confidence: 0 }),
      analyzeImages: async () => ({ ok: false, status: 500, error: "n/a" }) as any,
      generateScreen: async (input) => {
        captured.push(input);
        return { ok: true, siteName: "P", generationResult: "v6", v6Debug: {} as any, variants: [{ id: "v", name: "Base", description: "", strategy: "safe", pageTree: {
          id: "root", type: "frame", name: "Page", style: { display: "flex", flexDirection: "column", width: 1440 },
          children: [{ id: "hero", type: "frame", name: "Hero", style: { display: "flex", flexDirection: "column" }, children: [{ id: "t", type: "text", name: "Title", style: { fontSize: 64 }, content: { text: "Press" } }] }],
        } } as any] };
      },
    },
  });
  const input: EngineInput = { projectId: "proj_a", mode: "screen", target: "editor", prompt: "Landing page", references: [{ id: "r1", url: "https://img.example/a.png", weight: "primary" }] };
  const runId = await deps.store.create({ projectId: "proj_a", kind: "screen", input: input as any, stepKeys: [...ENGINE_STEPS] });
  const outcome = await executePipeline({ runId, input, deps });
  assert.equal(outcome.status, "complete", outcome.error ?? "");
  const run = (await deps.store.get(runId))!;
  const taste = JSON.parse((run.steps.find((s) => s.key === "compileTaste")!.checkpoint as any).json);
  assert.deepEqual(taste.layered.learned.map((r: any) => r.id), ["p-user"]);
  assert.equal(captured[0].layeredTaste.learned[0].id, "p-user", "generation receives the layered taste");
  console.log("[proof] 6. measured colors refine derived/default tokens (not explicit); engine checkpoints layered taste and generation receives it");
}

async function main() {
  testLegacyUnchanged();
  testProvenanceEverywhere();
  testHardOnlyFromMeasured();
  testArchetypeHint();
  testLearnedScope();
  await testTokensAndEngine();
  console.log("taste-compile proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
