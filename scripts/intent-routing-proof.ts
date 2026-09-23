/**
 * Proof gate 0.2 — intent routing.
 *
 * 1. The six prompts from architecture review §2.5 classify correctly with the
 *    word-boundary heuristic, plus landing-page controls.
 * 2. The async model classifier is used when it answers with a valid, confident
 *    classification; it falls back to the heuristic on errors, invalid enums and
 *    low confidence (model mocked).
 * 3. A pre-routed classification is reused so editor routing and generation agree.
 * 4. Reference roles use real ids / weights / annotations — never the image URL.
 * 5. Live model check runs only when OPENROUTER_API_KEY is set.
 *
 * Run: npm run proof:intent-routing
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPhraseMatcher, extractIntentProfile } from "../types/intent-profile";
import {
  buildIntentReferences,
  classifyIntent,
  parseIntentClassification,
  resolveIntentProfile,
} from "../lib/canvas/intent-classifier";

type Case = { prompt: string; outputType: string; notGoal?: string; goal?: string };

const REVIEW_CASES: Case[] = [
  { prompt: "An approachable landing page for a neighborhood bakery", outputType: "marketing-site", notGoal: "app-ui" },
  { prompt: "Landing page for an apparel brand", outputType: "marketing-site", notGoal: "app-ui" },
  { prompt: "A happy, colorful site for a kids' summer camp", outputType: "marketing-site", notGoal: "app-ui" },
  { prompt: "Website for a networking event for founders", outputType: "marketing-site", notGoal: "portfolio", goal: "community" },
  { prompt: "Onboarding flow for an iOS habit tracker", outputType: "mobile-app-ui", goal: "app-ui" },
  { prompt: "Checkout screen for a mobile shopping app", outputType: "mobile-app-ui", goal: "app-ui" },
];

const CONTROLS: Case[] = [
  { prompt: "Landing page for a habit tracker iPhone app", outputType: "marketing-site" },
  { prompt: "A portfolio website for an architecture photographer", outputType: "marketing-site", goal: "portfolio" },
  { prompt: "Analytics dashboard with a sidebar and a revenue table", outputType: "web-app-ui", goal: "app-ui" },
];

function checkMatcher() {
  const has = createPhraseMatcher("An approachable, happy apparel brand — networking; e-commerce and sign-up");
  assert.equal(has(["app"]), false, "`app` must not match approachable/happy/apparel");
  assert.equal(has(["work"]), false, "`work` must not match networking");
  assert.equal(has(["ecommerce", "e commerce"]), true, "hyphen/space tolerant phrases");
  assert.equal(has(["sign up"]), true);
  assert.equal(createPhraseMatcher("our iOS app")(["ios"]), true);
  assert.equal(createPhraseMatcher("Symphonic studios")(["ios"]), false);
}

function checkHeuristic() {
  for (const c of [...REVIEW_CASES, ...CONTROLS]) {
    const profile = extractIntentProfile({ prompt: c.prompt });
    assert.equal(profile.outputType, c.outputType, `${c.prompt} → outputType ${profile.outputType}`);
    if (c.goal) assert.equal(profile.businessGoal, c.goal, `${c.prompt} → goal ${profile.businessGoal}`);
    if (c.notGoal) assert.notEqual(profile.businessGoal, c.notGoal, `${c.prompt} → goal must not be ${c.notGoal}`);
    assert.equal(profile.classifiedBy, "heuristic");
    console.log(`[proof] heuristic  ${profile.outputType.padEnd(15)} ${profile.businessGoal.padEnd(10)} ← ${c.prompt}`);
  }
}

async function checkModelClassifier() {
  const prompt = "An approachable landing page for a neighborhood bakery";

  const fromModel = await classifyIntent({
    prompt,
    classify: async () =>
      JSON.stringify({
        outputType: "marketing-site",
        businessGoal: "commerce",
        confidence: 0.92,
        alternatives: [{ outputType: "multi-page-site", businessGoal: "commerce", confidence: 0.2 }, { outputType: "nope" }],
      }),
  });
  assert.equal(fromModel.classifiedBy, "model");
  assert.equal(fromModel.businessGoal, "commerce");
  assert.equal(fromModel.confidence, 0.92);
  assert.deepEqual(fromModel.alternatives, [{ outputType: "multi-page-site", businessGoal: "commerce", confidence: 0.2 }]);

  const onError = await classifyIntent({ prompt, classify: async () => { throw new Error("upstream 500"); } });
  assert.equal(onError.classifiedBy, "heuristic");
  assert.equal(onError.outputType, "marketing-site");

  const invalid = await classifyIntent({
    prompt,
    classify: async () => ({ outputType: "web-app", businessGoal: "app-ui", confidence: 0.99 }),
  });
  assert.equal(invalid.classifiedBy, "heuristic", "invalid enum falls back");

  const lowConfidence = await classifyIntent({
    prompt,
    classify: async () => ({ outputType: "web-app-ui", businessGoal: "app-ui", confidence: 0.3 }),
  });
  assert.equal(lowConfidence.classifiedBy, "heuristic", "low confidence falls back");
  assert.equal(lowConfidence.outputType, "marketing-site");

  const noKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  const keyless = await classifyIntent({ prompt: "Onboarding flow for an iOS habit tracker" });
  if (noKey) process.env.OPENROUTER_API_KEY = noKey;
  assert.equal(keyless.classifiedBy, "heuristic");
  assert.equal(keyless.outputType, "mobile-app-ui");

  // Pre-routed classification is reused verbatim (editor routing == generation reading).
  let called = false;
  const reused = await resolveIntentProfile({
    prompt: "Checkout screen for a mobile shopping app",
    classification: { outputType: "mobile-app-ui", businessGoal: "commerce", confidence: 0.8, alternatives: [] },
    classify: async () => { called = true; return null; },
  });
  assert.equal(called, false, "a valid pre-routed classification skips reclassification");
  assert.equal(reused.outputType, "mobile-app-ui");
  assert.equal(reused.businessGoal, "commerce");

  const tampered = await resolveIntentProfile({
    prompt: "Checkout screen for a mobile shopping app",
    classification: { outputType: "<script>", businessGoal: "x", confidence: 1 },
    classify: async () => null,
  });
  assert.equal(tampered.classifiedBy, "heuristic", "invalid client classification is ignored");

  assert.equal(parseIntentClassification("```json\n{\"outputType\":\"component\",\"businessGoal\":\"component-system\",\"confidence\":0.7}\n```")?.outputType, "component");
  console.log("[proof] model classifier: used when valid + confident; heuristic fallback on error/invalid/low confidence/no key");
}

function checkReferenceRoles() {
  const urls = ["https://img.example/typography-specimen.png", "https://img.example/b.png", "https://img.example/c.png"];
  const real = buildIntentReferences({
    referenceUrls: urls,
    references: [
      { id: "ref-abc", weight: "primary", annotation: "use the typography" },
      { id: "ref-def", weight: "muted" },
      { id: "ref-ghi", weight: "default", annotation: "palette only" },
    ],
  });
  const profile = extractIntentProfile({ prompt: "Landing page for a type foundry", references: real });
  assert.deepEqual(
    profile.referenceRoles.map((r) => [r.referenceId, r.weight, r.role]),
    [["ref-abc", "primary", "typography"], ["ref-def", "muted", "typography"], ["ref-ghi", "default", "palette"]],
  );
  assert.equal(profile.literalness, "balanced", "a primary reference makes literalness balanced");
  assert.ok(profile.referenceRoles.every((r) => !r.rationale?.startsWith("http")), "annotations are never URLs");

  const positional = buildIntentReferences({
    referenceUrls: urls,
    compositionData: [{ weight: "primary", referenceIndex: 1 }],
  });
  assert.deepEqual(positional, [
    { id: "reference-1", weight: "default" },
    { id: "reference-2", weight: "primary" },
    { id: "reference-3", weight: "default" },
  ]);

  for (const file of [
    "lib/canvas/generate-design-core.ts",
    "lib/canvas/generate-screen-set-core.ts",
    "app/api/canvas/generate-component/route.ts",
  ]) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /annotation:\s*url/, `${file} must not pass the URL as annotation`);
    assert.match(src, /resolveIntentProfile\(/, `${file} resolves intent through the classifier`);
  }
  const composer = readFileSync("app/canvas-v1/components/PromptComposerV2.tsx", "utf8");
  assert.match(composer, /\/api\/intent\/classify/, "editor routes on the model classifier");
  assert.match(composer, /intentClassification:/, "editor forwards its routing classification");
  console.log("[proof] reference roles carry real ids, weights and annotations");
}

async function checkLive() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log("[proof] SKIP live model classification (OPENROUTER_API_KEY not set)");
    return;
  }
  for (const c of REVIEW_CASES) {
    const profile = await classifyIntent({ prompt: c.prompt });
    assert.equal(profile.outputType, c.outputType, `[live:${profile.classifiedBy}] ${c.prompt} → ${profile.outputType}`);
    console.log(`[proof] live ${profile.classifiedBy}  ${profile.outputType} ← ${c.prompt}`);
  }
}

async function main() {
  checkMatcher();
  checkHeuristic();
  await checkModelClassifier();
  checkReferenceRoles();
  await checkLive();
  console.log("intent-routing proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
