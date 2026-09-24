/**
 * Proof gate 1.10 — cacheable prompt prefix and per-step model routing.
 *
 * 1. Routes resolve: every route names a model, env overrides win, and the
 *    judge defaults to a different model family from the generator.
 * 2. No hard-coded model constants at call sites (lib/, app/).
 * 3. The design prompt's prefix is stable (same hash across briefs, taste,
 *    tokens, knobs and layered directives) per prompt frame, long enough to
 *    cache, and the full prompt is prefix + suffix.
 * 4. Generation sends the prefix first with a cache breakpoint on the routed
 *    model; hints are stripped for families that do not take them; cached
 *    tokens reach telemetry.
 * 5. With OPENROUTER_API_KEY: cached tokens > 0 on the second call (live).
 *
 * Run: npm run proof:model-routes
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  cacheablePromptParts,
  MODEL_ROUTES,
  modelFamily,
  modelFor,
  setRouterForTesting,
  tracedCompletion,
  withCacheHints,
  type ModelRoute,
} from "../lib/ai/model-router";
import { pendingModelCallRecords, setModelTelemetrySink } from "../lib/ai/model-telemetry";
import { buildDesignTreePrompt, buildDesignTreePromptParts } from "../lib/canvas/design-tree-prompt";
import { defaultDesignTokens } from "../lib/agent/default-design-tokens";
import { compileLayeredTaste } from "../lib/taste/compile";
import { LEGACY_PROFILES } from "./fixtures/legacy-taste-profiles";

const LIVE_KEY = process.env.OPENROUTER_API_KEY;
setModelTelemetrySink(null);

const sha = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

function testRoutes() {
  const routes = Object.keys(MODEL_ROUTES) as ModelRoute[];
  for (const required of ["perceive", "classify", "generate", "variant", "judge"] as const) assert.ok(routes.includes(required), `route ${required}`);
  for (const route of routes) {
    const entry = MODEL_ROUTES[route];
    delete process.env[entry.env];
    assert.match(modelFor(route), /^[a-z0-9-]+\/[a-z0-9.\-]+$/, `${route} resolves to a model id`);
    process.env[entry.env] = "openai/gpt-override";
    assert.equal(modelFor(route), "openai/gpt-override", `${entry.env} overrides ${route}`);
    delete process.env[entry.env];
  }
  assert.notEqual(modelFamily(modelFor("judge")), modelFamily(modelFor("generate")), "judge family ≠ generator family");
  assert.notEqual(modelFamily(modelFor("judge")), modelFamily(modelFor("variant")), "judge family ≠ variant family");
  console.log(`[proof] 1. routes: ${routes.map((r) => `${r}=${modelFor(r)}`).join(" · ")}`);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function testNoHardcodedModels() {
  const allowed = new Set(["lib/ai/model-router.ts", "lib/ai/model-prices.ts"]);
  const offenders: string[] = [];
  for (const file of [...walk("lib"), ...walk("app")]) {
    if (allowed.has(file)) continue;
    const source = readFileSync(file, "utf8");
    if (/\b(SONNET_4_6|GEMINI_FLASH|GEMINI_PRO|KIMI_K25)\b|model:\s*["'`](anthropic|google|openai|moonshotai)\//.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], "call sites use modelFor(route)");
  console.log("[proof] 2. no hard-coded model constants at call sites in lib/ and app/");
}

function testStablePrefix() {
  const tokensA = defaultDesignTokens();
  const tokensB = { ...tokensA, colors: { ...tokensA.colors, accent: "#D9480F", background: "#0B0C0E" } };
  const variants = [
    buildDesignTreePromptParts(tokensA, "Landing page for a small press", "Small Press", {}),
    buildDesignTreePromptParts(tokensB, "Portfolio for a photographer", "Lens", { tasteProfile: LEGACY_PROFILES.editorial, fidelityMode: "close" }),
    buildDesignTreePromptParts(tokensA, "Launch page for a coffee brand", "Roast", { tasteProfile: LEGACY_PROFILES.minimal, fidelityMode: "push", compositionContext: "Primary reference: asymmetric editorial grid" }),
    buildDesignTreePromptParts(tokensB, "Agency site", "Studio", {
      layeredTaste: compileLayeredTaste({ derived: LEGACY_PROFILES.editorial, briefDirectives: [{ dimension: "layout", rule: "Use a 12-column grid", value: { columns: 12 }, hardness: "hard", provenance: { source: "measured", confidence: 1 } }] }),
    }),
  ];
  const marketingHash = sha(variants[0]!.prefix);
  for (const v of variants) assert.equal(sha(v.prefix), marketingHash, "marketing prefix is stable");
  assert.equal(new Set(variants.map((v) => v.suffix)).size, variants.length, "suffixes carry the per-request differences");
  assert.ok(variants[0]!.prefix.length >= 4000, `prefix is cacheable size (${variants[0]!.prefix.length} chars)`);
  assert.match(variants[0]!.prefix, /## DesignNode Schema[\s\S]*## Rules[\s\S]*## Output/);
  assert.doesNotMatch(variants[0]!.prefix, /Small Press|## Creative Brief|## Design Tokens/, "no per-request content in the prefix");
  assert.match(variants[1]!.suffix, /## Creative Brief\n"Portfolio for a photographer"[\s\S]*## Design Tokens\n- background: #0B0C0E/);

  const appIntent = (summary: string): any => ({
    summary, outputType: "web-app-ui", businessGoal: "productivity", confidence: 0.9, contentPriority: ["data"], mustInclude: [], mustAvoid: [],
    copyTone: "concise", literalness: "balanced", referenceRoles: [], alternatives: [],
  });
  const app = [
    buildDesignTreePromptParts(tokensA, "Invoice dashboard", "Ledger", { tasteProfile: LEGACY_PROFILES.saasOverrides, intentProfile: appIntent("Invoices"), breakpoint: "desktop" }),
    buildDesignTreePromptParts(tokensB, "Team settings screen", "Crew", { tasteProfile: LEGACY_PROFILES.editorial, intentProfile: appIntent("Settings"), fidelityMode: "close" }),
  ];
  const appKinds = app.map((a) => sha(a.prefix));
  assert.match(app[0]!.prefix, /Product UI Vocabulary/, "app frame prefix");
  assert.equal(appKinds[0], appKinds[1], "app prefix is stable");
  assert.notEqual(appKinds[0], marketingHash, "one prefix per prompt frame");
  const full = buildDesignTreePrompt(tokensA, "Landing page for a small press", "Small Press", {});
  assert.equal(full, `${variants[0]!.prefix}\n\n${variants[0]!.suffix}`);
  console.log(`[proof] 3. prefix hash stable across 4 briefs/tastes/tokens: ${marketingHash} (${variants[0]!.prefix.length} chars); app frame: ${appKinds[0]}`);
}

async function testCacheHintsSent() {
  const sent: any[] = [];
  setRouterForTesting({
    chat: {
      completions: {
        create: async (body: any) => {
          sent.push(body);
          return { model: body.model, usage: { prompt_tokens: 5000, completion_tokens: 10, prompt_tokens_details: { cached_tokens: sent.length > 1 ? 4200 : 0 } }, choices: [{ message: { content: "{}" }, finish_reason: "stop" }] };
        },
      },
    },
  } as never);
  process.env.OPENROUTER_API_KEY = LIVE_KEY ?? "proof-key";
  try {
    const { prefix, suffix } = buildDesignTreePromptParts(defaultDesignTokens(), "Landing page", "Press", {});
    const { generateV6DesignVariants } = await import("../lib/canvas/generate-design-core");
    process.env.MODEL_ROUTE_GENERATE = "anthropic/claude-proof-generate";
    await generateV6DesignVariants({ prompt: "Landing page", tokens: defaultDesignTokens(), siteName: "Press", referenceUrls: [], fidelityMode: "balanced" } as any).catch(() => undefined);
    delete process.env.MODEL_ROUTE_GENERATE;
    const base = sent.find((b) => b.model === "anthropic/claude-proof-generate");
    assert.ok(base, `generation used the routed model (${sent.map((b) => b.model)})`);
    const parts = base.messages[0].content;
    assert.equal(parts[0].cache_control?.type, "ephemeral", "prefix carries a cache breakpoint");
    assert.equal(sha(parts[0].text), sha(prefix), "the cached part is exactly the stable prefix");
    assert.match(parts[1].text, /^## Creative Brief\n"Landing page"[\s\S]*## Design Tokens/, "then the per-request suffix");

    // Families without explicit breakpoints get them stripped; long system prompts get one.
    const openai = withCacheHints({ model: "openai/gpt-5", messages: [{ role: "user", content: cacheablePromptParts(prefix, suffix) }] } as any);
    assert.ok(!("cache_control" in (openai.messages[0] as any).content[0]), "stripped for openai");
    const system = withCacheHints({ model: "anthropic/claude-sonnet-4-6", messages: [{ role: "system", content: prefix }, { role: "user", content: "hi" }] } as any);
    assert.equal((system.messages[0] as any).content[0].cache_control.type, "ephemeral", "long system prompt gets a breakpoint");
    const short = withCacheHints({ model: "anthropic/claude-sonnet-4-6", messages: [{ role: "system", content: "short" }] } as any);
    assert.equal((short.messages[0] as any).content, "short", "short system prompts untouched");

    // Cached tokens reach telemetry.
    await tracedCompletion("proof.cache", { model: modelFor("generate"), messages: [{ role: "user", content: cacheablePromptParts(prefix, suffix) }] });
    const record = pendingModelCallRecords().filter((r) => r.step === "proof.cache").at(-1)!;
    assert.equal(record.cachedInputTokens, 4200);
  } finally {
    setRouterForTesting(null);
    if (!LIVE_KEY) delete process.env.OPENROUTER_API_KEY;
  }
  console.log("[proof] 4. generation sends [prefix + cache_control, suffix] on the routed model; hints stripped where unsupported; cached tokens reach telemetry");
}

async function testLiveCache() {
  if (!LIVE_KEY) {
    console.log("[proof] 5. live cache check skipped (no OPENROUTER_API_KEY)");
    return;
  }
  const { prefix } = buildDesignTreePromptParts(defaultDesignTokens(), "Landing page", "Press", {});
  const call = (n: number) =>
    tracedCompletion(`proof.live-cache-${n}`, {
      model: modelFor("generate"),
      max_tokens: 5,
      messages: [{ role: "user", content: cacheablePromptParts(prefix, `Reply with the word ok. (${n})`) }],
    });
  await call(1);
  const second = await call(2);
  const cached = (second.usage as any)?.prompt_tokens_details?.cached_tokens ?? (second.usage as any)?.cache_read_input_tokens ?? 0;
  assert.ok(cached > 0, `second call reads the cached prefix (cached tokens: ${cached})`);
  console.log(`[proof] 5. live: second call cached ${cached} prompt tokens on ${modelFor("generate")}`);
}

async function main() {
  testRoutes();
  testNoHardcodedModels();
  testStablePrefix();
  await testCacheHintsSent();
  await testLiveCache();
  console.log("model-routes proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
