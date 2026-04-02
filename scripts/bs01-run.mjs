/**
 * BS-01 single-run benchmark — pure Node.js (no tsx needed)
 * Replicates the benchmark harness for BS-01 editorial only.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load .env.local
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

const DEV_BASE = "http://localhost:3000";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";

if (!OPENROUTER_KEY) { console.error("Missing OPENROUTER_API_KEY"); process.exit(1); }

// Helpers
function toBase64DataUri(filePath) {
  if (filePath.startsWith("http") || filePath.startsWith("data:")) return filePath;
  const abs = path.resolve(ROOT, filePath);
  const ext = path.extname(abs).toLowerCase().replace(".", "");
  const mime = (ext === "jpg" || ext === "jpeg") ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";
  return `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
}

// Load BS-01
const setsFile = JSON.parse(fs.readFileSync(path.join(ROOT, "benchmark-sets.json"), "utf-8"));
const bs01 = setsFile.sets.find(s => s.id === "BS-01");
if (!bs01) { console.error("BS-01 not found in benchmark-sets.json"); process.exit(1); }

console.log("=== BS-01 Editorial — Single DesignNode Run ===\n");
console.log(`Date: ${new Date().toISOString()}`);
console.log(`Brief: ${bs01.brief}\n`);

// Resolve references
const refUrls = bs01.references
  .filter(r => r.imageUrl && r.imageUrl !== "TODO")
  .map(r => r.imageUrl);
console.log(`References: ${refUrls.length} resolved\n`);

// Phase 1: Taste extraction
console.log("── Phase 1: Taste Extraction ──");
process.stdout.write("  Calling Sonnet 4.6 with 5 images... ");

const tasteSystemPrompt = `You are the Taste Engine for Studio OS — a reference-informed design intelligence system.
Analyze visual references and return a structured TasteProfile JSON that drives website generation.

Archetypes: premium-saas | editorial-brand | minimal-tech | creative-portfolio | culture-brand | experimental

Rules:
1. Be specific and opinionated — generic output is a failure
2. Provide REAL hex color values derived from the references
3. Recommend specific font pairings by name
4. Include exactly 5 specific, actionable avoid items
5. Set confidence based on reference count and coherence
6. "modern", "clean", "professional" are banned adjectives
7. archetypeConfidence max 0.92
8. summary must be 1 sentence, specific to this set
9. Respond ONLY with compact JSON. No markdown, no explanation.

Required schema:
{
  "summary": string,
  "adjectives": string[4],
  "archetypeMatch": string,
  "archetypeConfidence": number,
  "secondaryArchetype": string | null,
  "layoutBias": { "density": "spacious|balanced|dense", "rhythm": "alternating|sequential|asymmetric|magazine", "heroStyle": "full-bleed|split|text-dominant|contained", "sectionFlow": "stacked|alternating|magazine", "gridBehavior": "strict|fluid|broken|editorial", "whitespaceIntent": "structural|decorative|minimal" },
  "typographyTraits": { "scale": "condensed|normal|expanded", "headingTone": "geometric|humanist|editorial|technical|expressive", "bodyTone": "neutral|editorial|minimal", "contrast": "low|medium|high", "casePreference": "lower|mixed|upper|title", "recommendedPairings": string[2] },
  "colorBehavior": { "mode": "light|dark|mixed", "palette": "monochrome|neutral-plus-accent|full-color", "accentStrategy": "single-pop|gradient-bold|no-accent", "saturation": "muted|vivid|saturated", "temperature": "warm|cool|neutral", "suggestedColors": { "background": hex, "surface": hex, "text": hex, "accent": hex, "secondary": hex } },
  "imageTreatment": { "style": "editorial|product|atmospheric|none", "sizing": "full-bleed|hero-scale|contained|thumbnail", "treatment": "raw|duotone|grayscale|tinted", "cornerRadius": "none|subtle|rounded", "borders": boolean, "shadow": "none|subtle|dramatic", "aspectPreference": "portrait|landscape|square|mixed" },
  "ctaTone": { "style": "bold|understated|ghost|inline", "shape": "sharp|subtle-radius|pill", "hierarchy": "primary-dominant|balanced|minimal" },
  "avoid": string[5],
  "confidence": number,
  "referenceCount": number,
  "dominantReferenceType": "ui-screenshot|poster|photography|mixed",
  "warnings": string[]
}`;

const imageBlocks = refUrls.slice(0, 5).map(url => ({
  type: "image_url",
  image_url: { url: toBase64DataUri(url), detail: "low" }
}));

const tasteRes = await fetch(OPENROUTER_CHAT, {
  method: "POST",
  headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "anthropic/claude-sonnet-4-6",
    max_tokens: 2600,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: tasteSystemPrompt },
      { role: "user", content: [{ type: "text", text: `Analyze these 5 visual references for BS-01 editorial. Return compact TasteProfile JSON only.` }, ...imageBlocks] }
    ]
  })
});

if (!tasteRes.ok) {
  const body = await tasteRes.text().catch(() => "");
  console.error(`\nTaste extraction failed (${tasteRes.status}): ${body.slice(0, 300)}`);
  process.exit(1);
}

const tasteData = await tasteRes.json();
const tasteText = tasteData.choices?.[0]?.message?.content ?? "{}";
const tasteMatch = tasteText.match(/\{[\s\S]*\}/);
const tasteProfile = JSON.parse(tasteMatch[0]);
console.log(`✓ archetype=${tasteProfile.archetypeMatch}, confidence=${tasteProfile.confidence}`);
console.log(`  Adjectives: ${tasteProfile.adjectives?.join(", ")}`);
console.log(`  Avoid: ${tasteProfile.avoid?.join(", ")}\n`);

// Check dev server
process.stdout.write("  Checking dev server... ");
try {
  const ping = await fetch(DEV_BASE, { signal: AbortSignal.timeout(3000) });
  console.log("✓ running\n");
} catch {
  console.log("✗ NOT RUNNING — start with npm run dev");
  process.exit(1);
}

// Neutral tokens
const NEUTRAL_TOKENS = {
  colors: { primary: "#111111", secondary: "#555555", accent: "#2563EB", background: "#FFFFFF", surface: "#F5F5F5", text: "#111111", textMuted: "#6B7280", border: "#E5E7EB" },
  typography: { fontFamily: "Inter", scale: { xs: "12px", sm: "14px", base: "16px", lg: "18px", xl: "20px", "2xl": "24px", "3xl": "30px", "4xl": "36px" }, weights: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: "1.25", normal: "1.5", relaxed: "1.75" } },
  spacing: { unit: 4, scale: { "1": "4px", "2": "8px", "3": "12px", "4": "16px", "6": "24px", "8": "32px", "12": "48px", "16": "64px" } },
  radii: { sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },
  shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)", md: "0 4px 6px rgba(0,0,0,0.1)", lg: "0 10px 15px rgba(0,0,0,0.1)" },
  animation: { spring: { smooth: { stiffness: 200, damping: 25 }, snappy: { stiffness: 300, damping: 30 } } }
};

async function generateVariants(brief, taste, refs) {
  const sendableRefs = taste ? refs.slice(0, 4).map(toBase64DataUri) : [];
  const body = {
    prompt: brief, tokens: NEUTRAL_TOKENS, mode: "variants",
    tasteProfile: taste ?? null, referenceUrls: sendableRefs,
    fidelityMode: taste ? "balanced" : undefined, useDesignNode: true
  };
  const res = await fetch(`${DEV_BASE}/api/canvas/generate-component`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000)
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error(`Generation failed (${res.status}): ${err.slice(0, 200)}`);
    return null;
  }
  return await res.json();
}

async function scoreTree(pageTree, taste) {
  const res = await fetch(`${DEV_BASE}/api/benchmark/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageTree, tasteProfile: taste }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!res.ok) return null;
  return await res.json();
}

// Phase 2: Generation + Scoring
console.log("── Phase 2: Generation + Scoring ──\n");

// RAW generation
process.stdout.write("  [RAW]       Generating (no taste)... ");
const t0 = Date.now();
const rawResult = await generateVariants(bs01.brief, null, []);
const rawTime = ((Date.now() - t0) / 1000).toFixed(1);

if (!rawResult) { console.error("RAW generation failed"); process.exit(1); }
const rawA = rawResult.variants[0];
console.log(`✓ source=${rawA.pageTreeSource} (${rawTime}s)`);

// HARNESSED generation
process.stdout.write("  [HARNESSED] Generating (with taste)... ");
const t1 = Date.now();
const harResult = await generateVariants(bs01.brief, tasteProfile, refUrls);
const harTime = ((Date.now() - t1) / 1000).toFixed(1);

if (!harResult) { console.error("HARNESSED generation failed"); process.exit(1); }
const harA = harResult.variants[0];
console.log(`✓ source=${harA.pageTreeSource} (${harTime}s)`);

// Score RAW
process.stdout.write("  [SCORE RAW] Scoring raw vs taste... ");
const rawScore = await scoreTree(rawA.pageTree, tasteProfile);
if (rawScore) {
  console.log(`✓ palette=${rawScore.palette} type=${rawScore.typography} density=${rawScore.density} struct=${rawScore.structure} overall=${rawScore.overall}`);
} else {
  console.log("✗ failed");
}

// Score HARNESSED
let harScore = harA.fidelityScore;
if (!harScore) {
  process.stdout.write("  [SCORE HAR] Scoring harnessed vs taste... ");
  harScore = await scoreTree(harA.pageTree, tasteProfile);
}
if (harScore) {
  console.log(`  [SCORE HAR] palette=${harScore.palette} type=${harScore.typography} density=${harScore.density} struct=${harScore.structure} overall=${harScore.overall}`);
} else {
  console.log("  [SCORE HAR] ✗ failed");
}

// Delta
if (rawScore && harScore) {
  const d = {
    palette: +(harScore.palette - rawScore.palette).toFixed(1),
    typography: +(harScore.typography - rawScore.typography).toFixed(1),
    density: +(harScore.density - rawScore.density).toFixed(1),
    structure: +(harScore.structure - rawScore.structure).toFixed(1),
    overall: +(harScore.overall - rawScore.overall).toFixed(1),
  };
  const s = n => n > 0 ? `+${n}` : `${n}`;
  console.log(`\n  ══ DELTA ══  palette=${s(d.palette)} type=${s(d.typography)} density=${s(d.density)} struct=${s(d.structure)} overall=${s(d.overall)}`);

  if (d.overall >= 3) console.log("  ✓ TARGET MET: Delta >= 3.0");
  else if (d.overall > 0) console.log(`  ⚡ Improvement but below 3.0 target`);
  else console.log("  ✗ No improvement");

  // Save result
  const outDir = path.join(ROOT, "benchmark-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(outDir, `bs01-designnode-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    set: "BS-01",
    pipeline: "DesignNode",
    tasteProfile,
    raw: { source: rawA.pageTreeSource, score: rawScore, generationTime: rawTime + "s", variantCount: rawResult.variants.length },
    harnessed: { source: harA.pageTreeSource, score: harScore, generationTime: harTime + "s", variantCount: harResult.variants.length },
    delta: d,
    targetMet: d.overall >= 3,
    rawTree: rawA.pageTree,
    harnessedTree: harA.pageTree,
  }, null, 2));
  console.log(`\n  ✓ Results saved: benchmark-results/bs01-designnode-${ts}.json`);
}

console.log("\n=== BS-01 run complete ===");
