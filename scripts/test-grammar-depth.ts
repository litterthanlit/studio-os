/**
 * Grammar Depth Gate Test — Generation Vocabulary Depth (2026-04-10)
 *
 * Generates the same brief across all 6 archetypes to validate that
 * deep grammars (premium-saas, editorial-brand, culture-brand, creative-portfolio)
 * produce visibly better, category-appropriate output compared to shallow grammars
 * (minimal-tech, experimental).
 *
 * Usage:
 *   npx tsx scripts/test-grammar-depth.ts
 *
 * Requires:
 *   - Dev server running on port 3000 (npm run dev)
 *   - OPENROUTER_API_KEY in .env.local
 *
 * Output:
 *   benchmark-results/grammar-depth-test/grammar-depth-<timestamp>.json
 *
 * Cost estimate: ~$1-2 (12 Sonnet 4.6 calls via OpenRouter)
 */

import * as fs from "fs";
import * as path from "path";

// ── Load .env.local ──────────────────────────────────────────────────────────

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

// ── Config ──────────────────────────────────────────────────────────────────

const DEV_PORT = process.env.BENCHMARK_PORT || "3000";
const DEV_BASE = `http://localhost:${DEV_PORT}`;

// Same brief for all archetypes — archetype-neutral so grammar drives differentiation
const TEST_BRIEF = "Design a landing page for a creative design studio that makes brand identities. The studio is called 'Atelier Forme' and they work with cultural institutions, fashion brands, and tech companies.";
const SITE_NAME = "Atelier Forme";

// Minimal design tokens — let the archetype grammar drive the look
const BASE_TOKENS = {
  colors: {
    primary: "#1A1A1A",
    accent: "#4B57DB",
    background: "#FAFAF8",
    surface: "#FFFFFF",
    text: "#1A1A1A",
    textMuted: "#6B6B6B",
    border: "#E5E5E0",
    secondary: "#F5F5F0",
  },
  typography: {
    fontFamily: "Inter, Helvetica Neue, sans-serif",
    scale: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem" },
    weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: "1.25", normal: "1.5", relaxed: "1.75" },
  },
  spacing: {
    unit: 8,
    scale: { "0": "0", "1": "8px", "2": "16px", "3": "24px", "4": "32px", "6": "48px", "8": "64px", "12": "96px", "16": "128px" },
  },
  radii: { sm: "8px", md: "16px", lg: "24px", xl: "32px", full: "9999px" },
  shadows: {
    sm: "0 6px 16px rgba(15, 23, 42, 0.08)",
    md: "0 18px 40px rgba(15, 23, 42, 0.12)",
    lg: "0 28px 60px rgba(15, 23, 42, 0.16)",
  },
  animation: {
    spring: {
      smooth: { stiffness: 120, damping: 16 },
      snappy: { stiffness: 220, damping: 18 },
      gentle: { stiffness: 90, damping: 20 },
      bouncy: { stiffness: 260, damping: 14 },
    },
  },
};

// One TasteProfile per archetype — minimal overrides, let grammar do the work
const ARCHETYPE_PROFILES: Record<string, Record<string, unknown>> = {
  "premium-saas": {
    summary: "Clean product-focused SaaS with premium feel",
    adjectives: ["precise", "structured", "polished", "restrained", "functional"],
    archetypeMatch: "premium-saas",
    archetypeConfidence: 0.85,
    layoutBias: { density: "spacious", rhythm: "uniform", heroStyle: "contained", sectionFlow: "stacked", gridBehavior: "strict", whitespaceIntent: "structural" },
    typographyTraits: { scale: "moderate", headingTone: "geometric", bodyTone: "neutral", contrast: "medium", casePreference: "mixed", recommendedPairings: ["Inter + Inter"] },
    colorBehavior: { mode: "light", palette: "monochromatic", accentStrategy: "single-pop", saturation: "muted", temperature: "cool", suggestedColors: { background: "#FAFAF8", surface: "#FFFFFF", text: "#1A1A1A", accent: "#4B57DB" } },
    imageTreatment: { style: "product", sizing: "contained", treatment: "raw", cornerRadius: "subtle", borders: true, shadow: "subtle", aspectPreference: "landscape" },
    ctaTone: { style: "bold", shape: "subtle-radius", hierarchy: "primary-dominant" },
    avoid: ["decorative gradients", "script fonts", "rounded pill shapes", "heavy drop shadows"],
    confidence: 0.85,
    referenceCount: 0,
    dominantReferenceType: "mixed",
    warnings: [],
  },
  "editorial-brand": {
    summary: "Magazine-like editorial with typography-forward design",
    adjectives: ["editorial", "typographic", "layered", "confident", "restrained"],
    archetypeMatch: "editorial-brand",
    archetypeConfidence: 0.85,
    layoutBias: { density: "spacious", rhythm: "alternating", heroStyle: "full-bleed", sectionFlow: "editorial-grid", gridBehavior: "editorial", whitespaceIntent: "dramatic" },
    typographyTraits: { scale: "dramatic", headingTone: "editorial", bodyTone: "literary", contrast: "extreme", casePreference: "mixed", recommendedPairings: ["Newsreader + Inter"] },
    colorBehavior: { mode: "light", palette: "monochromatic", accentStrategy: "no-accent", saturation: "desaturated", temperature: "neutral", suggestedColors: { background: "#FAF9F6", surface: "#FFFFFF", text: "#1A1A1A", accent: "#1A1A1A" } },
    imageTreatment: { style: "editorial", sizing: "full-bleed", treatment: "raw", cornerRadius: "none", borders: false, shadow: "none", aspectPreference: "mixed" },
    ctaTone: { style: "editorial", shape: "sharp", hierarchy: "text-link-preferred" },
    avoid: ["feature grids", "pricing tables", "logo bars", "stats rows", "SaaS CTA language"],
    confidence: 0.85,
    referenceCount: 0,
    dominantReferenceType: "mixed",
    warnings: [],
  },
  "culture-brand": {
    summary: "Dark, photography-led culture brand with graphic tension",
    adjectives: ["bold", "cultural", "graphic", "confident", "editorial"],
    archetypeMatch: "culture-brand",
    archetypeConfidence: 0.85,
    layoutBias: { density: "balanced", rhythm: "alternating", heroStyle: "full-bleed", sectionFlow: "stacked", gridBehavior: "editorial", whitespaceIntent: "dramatic" },
    typographyTraits: { scale: "dramatic", headingTone: "display", bodyTone: "neutral", contrast: "extreme", casePreference: "uppercase-headings", recommendedPairings: ["Compakt + Helvetica Neue"] },
    colorBehavior: { mode: "dark", palette: "monochromatic", accentStrategy: "single-pop", saturation: "muted", temperature: "neutral", suggestedColors: { background: "#0F0F0F", surface: "#1A1A1A", text: "#E8E4DF", accent: "#EDEDED" } },
    imageTreatment: { style: "editorial", sizing: "full-bleed", treatment: "raw", cornerRadius: "none", borders: false, shadow: "none", aspectPreference: "mixed" },
    ctaTone: { style: "bold", shape: "sharp", hierarchy: "primary-dominant" },
    avoid: ["product screenshots on white", "feature benefit bullets", "stock lifestyle photography", "rounded corners", "SaaS patterns"],
    confidence: 0.85,
    referenceCount: 0,
    dominantReferenceType: "mixed",
    warnings: [],
  },
  "creative-portfolio": {
    summary: "Whitespace-heavy portfolio with asymmetric layouts and personal voice",
    adjectives: ["spacious", "asymmetric", "confident", "typographic", "personal"],
    archetypeMatch: "creative-portfolio",
    archetypeConfidence: 0.85,
    layoutBias: { density: "spacious", rhythm: "asymmetric", heroStyle: "text-dominant", sectionFlow: "editorial-grid", gridBehavior: "broken", whitespaceIntent: "dramatic" },
    typographyTraits: { scale: "dramatic", headingTone: "display", bodyTone: "neutral", contrast: "extreme", casePreference: "mixed", recommendedPairings: ["Neue Haas Grotesk + Freight Display"] },
    colorBehavior: { mode: "light", palette: "neutral-plus-accent", accentStrategy: "single-pop", saturation: "muted", temperature: "neutral", suggestedColors: { background: "#FAFAF8", surface: "#F5F5F0", text: "#1A1A1A", accent: "#1A1A1A" } },
    imageTreatment: { style: "editorial", sizing: "mixed", treatment: "raw", cornerRadius: "none", borders: false, shadow: "none", aspectPreference: "mixed" },
    ctaTone: { style: "understated", shape: "sharp", hierarchy: "text-link-preferred" },
    avoid: ["card grids", "corporate proof sections", "pricing tables", "SaaS CTAs", "thumbnail project grids"],
    confidence: 0.85,
    referenceCount: 0,
    dominantReferenceType: "mixed",
    warnings: [],
  },
  "minimal-tech": {
    summary: "Sparse, focused technical site with generous negative space",
    adjectives: ["minimal", "technical", "sparse", "focused", "precise"],
    archetypeMatch: "minimal-tech",
    archetypeConfidence: 0.85,
    layoutBias: { density: "spacious", rhythm: "uniform", heroStyle: "text-dominant", sectionFlow: "stacked", gridBehavior: "strict", whitespaceIntent: "structural" },
    typographyTraits: { scale: "moderate", headingTone: "geometric", bodyTone: "technical", contrast: "medium", casePreference: "mixed", recommendedPairings: ["Space Grotesk + IBM Plex Mono"] },
    colorBehavior: { mode: "light", palette: "monochromatic", accentStrategy: "single-pop", saturation: "desaturated", temperature: "cool", suggestedColors: { background: "#FAFAFA", surface: "#FFFFFF", text: "#171717", accent: "#0070F3" } },
    imageTreatment: { style: "product", sizing: "contained", treatment: "raw", cornerRadius: "subtle", borders: true, shadow: "subtle", aspectPreference: "landscape" },
    ctaTone: { style: "technical", shape: "subtle-radius", hierarchy: "primary-dominant" },
    avoid: ["busy feature grids", "testimonial carousels", "logo bars", "pricing tables with 3+ tiers"],
    confidence: 0.85,
    referenceCount: 0,
    dominantReferenceType: "mixed",
    warnings: [],
  },
  "experimental": {
    summary: "Rule-breaking layout with extreme typography and bold color",
    adjectives: ["experimental", "bold", "unconventional", "expressive", "dynamic"],
    archetypeMatch: "experimental",
    archetypeConfidence: 0.85,
    layoutBias: { density: "balanced", rhythm: "asymmetric", heroStyle: "full-bleed", sectionFlow: "overlapping", gridBehavior: "broken", whitespaceIntent: "dramatic" },
    typographyTraits: { scale: "dramatic", headingTone: "display", bodyTone: "neutral", contrast: "extreme", casePreference: "all-uppercase", recommendedPairings: ["Monument Extended + Söhne"] },
    colorBehavior: { mode: "dark", palette: "complementary", accentStrategy: "multi-accent", saturation: "vivid", temperature: "neutral", suggestedColors: { background: "#0A0A0A", surface: "#141414", text: "#F0F0F0", accent: "#FF4400" } },
    imageTreatment: { style: "abstract", sizing: "full-bleed", treatment: "high-contrast", cornerRadius: "none", borders: false, shadow: "none", aspectPreference: "mixed" },
    ctaTone: { style: "bold", shape: "sharp", hierarchy: "primary-dominant" },
    avoid: ["safe centered layouts", "standard section ordering", "conservative type sizes", "muted corporate palettes"],
    confidence: 0.85,
    referenceCount: 0,
    dominantReferenceType: "mixed",
    warnings: [],
  },
};

// Archetypes with deep grammars (should score higher)
const DEEP_GRAMMARS = ["premium-saas", "editorial-brand", "culture-brand", "creative-portfolio"];
const SHALLOW_GRAMMARS = ["minimal-tech", "experimental"];

// ── Helpers ─────────────────────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function checkDevServer(): Promise<boolean> {
  try {
    const res = await fetch(`${DEV_BASE}/api/canvas/generate-component`, { method: "OPTIONS" });
    return true;
  } catch {
    return false;
  }
}

type GenerationResult = {
  archetype: string;
  grammarDepth: "deep" | "shallow";
  success: boolean;
  error?: string;
  variantCount?: number;
  variants?: Array<{
    name: string;
    strategy: string;
    pageTreeSource: string;
    nodeCount: number;
    sectionCount: number;
    fidelityScore: Record<string, unknown> | null;
    sectionTypes: string[];
  }>;
  durationMs: number;
};

function countNodes(node: Record<string, unknown>): number {
  let count = 1;
  const children = node.children as Record<string, unknown>[] | undefined;
  if (children && Array.isArray(children)) {
    for (const child of children) {
      count += countNodes(child);
    }
  }
  return count;
}

function extractSectionNames(node: Record<string, unknown>): string[] {
  const children = node.children as Record<string, unknown>[] | undefined;
  if (!children || !Array.isArray(children)) return [];
  return children.map((child) => (child.name as string) || "unnamed");
}

// ── Generation ──────────────────────────────────────────────────────────────

async function generateForArchetype(archetype: string): Promise<GenerationResult> {
  const grammarDepth = DEEP_GRAMMARS.includes(archetype) ? "deep" : "shallow";
  const profile = ARCHETYPE_PROFILES[archetype];
  const startMs = Date.now();

  console.log(`  [${archetype}] Generating (${grammarDepth} grammar)...`);

  try {
    const res = await fetch(`${DEV_BASE}/api/canvas/generate-component`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "variants",
        prompt: TEST_BRIEF,
        tokens: BASE_TOKENS,
        siteName: SITE_NAME,
        tasteProfile: profile,
        fidelityMode: "balanced",
        useDesignNode: true,
      }),
    });

    const durationMs = Date.now() - startMs;

    if (!res.ok) {
      const errorText = await res.text();
      console.log(`  [${archetype}] FAILED (${res.status}): ${errorText.slice(0, 200)}`);
      return { archetype, grammarDepth, success: false, error: `${res.status}: ${errorText.slice(0, 200)}`, durationMs };
    }

    const data = await res.json() as Record<string, unknown>;
    const variants = data.variants as Array<Record<string, unknown>> | undefined;

    if (!variants || variants.length === 0) {
      console.log(`  [${archetype}] No variants returned`);
      return { archetype, grammarDepth, success: false, error: "No variants", durationMs };
    }

    const variantSummaries = variants.map((v) => {
      const pageTree = v.pageTree as Record<string, unknown>;
      return {
        name: (v.name as string) || "unnamed",
        strategy: (v.strategy as string) || "unknown",
        pageTreeSource: (v.pageTreeSource as string) || "unknown",
        nodeCount: pageTree ? countNodes(pageTree) : 0,
        sectionCount: pageTree ? extractSectionNames(pageTree).length : 0,
        fidelityScore: (v.fidelityScore as Record<string, unknown>) || null,
        sectionTypes: pageTree ? extractSectionNames(pageTree) : [],
      };
    });

    const baseVariant = variantSummaries[0];
    console.log(`  [${archetype}] OK — ${baseVariant.nodeCount} nodes, ${baseVariant.sectionCount} sections (${(durationMs / 1000).toFixed(1)}s)`);
    console.log(`    Sections: ${baseVariant.sectionTypes.join(", ")}`);

    return {
      archetype,
      grammarDepth,
      success: true,
      variantCount: variants.length,
      variants: variantSummaries,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  [${archetype}] ERROR: ${msg}`);
    return { archetype, grammarDepth, success: false, error: msg, durationMs };
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     Grammar Depth Gate Test — Generation Vocabulary     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log(`Brief: "${TEST_BRIEF.slice(0, 80)}..."`);
  console.log(`Site: ${SITE_NAME}`);
  console.log(`Archetypes: ${Object.keys(ARCHETYPE_PROFILES).length}`);
  console.log(`Deep grammars: ${DEEP_GRAMMARS.join(", ")}`);
  console.log(`Shallow grammars: ${SHALLOW_GRAMMARS.join(", ")}`);
  console.log(`Mode: single (base only, no pushed variant — saves cost)\n`);

  // Check dev server
  const serverUp = await checkDevServer();
  if (!serverUp) {
    console.error("ERROR: Dev server not running. Start it with: npm run dev");
    process.exit(1);
  }
  console.log(`Dev server: ${DEV_BASE} ✓\n`);

  // Generate sequentially to avoid rate limits
  const results: GenerationResult[] = [];
  const archetypes = Object.keys(ARCHETYPE_PROFILES);

  for (const archetype of archetypes) {
    const result = await generateForArchetype(archetype);
    results.push(result);
    console.log("");
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  RESULTS SUMMARY");
  console.log("══════════════════════════════════════════════════════════\n");

  const table: Array<{
    archetype: string;
    depth: string;
    status: string;
    nodes: number;
    sections: number;
    sectionNames: string;
    time: string;
  }> = [];

  for (const r of results) {
    const base = r.variants?.[0];
    table.push({
      archetype: r.archetype,
      depth: r.grammarDepth,
      status: r.success ? "OK" : "FAIL",
      nodes: base?.nodeCount || 0,
      sections: base?.sectionCount || 0,
      sectionNames: base?.sectionTypes.join(", ") || r.error || "",
      time: `${(r.durationMs / 1000).toFixed(1)}s`,
    });
  }

  // Print table
  console.log("Archetype            | Depth   | Status | Nodes | Sections | Time   | Section Names");
  console.log("---------------------|---------|--------|-------|----------|--------|-----------------------------");
  for (const row of table) {
    console.log(
      `${row.archetype.padEnd(21)}| ${row.depth.padEnd(8)}| ${row.status.padEnd(7)}| ${String(row.nodes).padEnd(6)}| ${String(row.sections).padEnd(9)}| ${row.time.padEnd(7)}| ${row.sectionNames.slice(0, 60)}`
    );
  }

  // ── Save results ──────────────────────────────────────────────────────────

  const outDir = path.join(process.cwd(), "benchmark-results", "grammar-depth-test");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `grammar-depth-${timestamp()}.json`);

  const output = {
    testName: "Grammar Depth Gate Test",
    date: new Date().toISOString(),
    brief: TEST_BRIEF,
    siteName: SITE_NAME,
    mode: "single (base only)",
    deepGrammars: DEEP_GRAMMARS,
    shallowGrammars: SHALLOW_GRAMMARS,
    results,
    summary: {
      total: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      avgNodesDeep: Math.round(
        results
          .filter((r) => r.grammarDepth === "deep" && r.success)
          .reduce((sum, r) => sum + (r.variants?.[0]?.nodeCount || 0), 0) /
          Math.max(1, results.filter((r) => r.grammarDepth === "deep" && r.success).length)
      ),
      avgNodesShallow: Math.round(
        results
          .filter((r) => r.grammarDepth === "shallow" && r.success)
          .reduce((sum, r) => sum + (r.variants?.[0]?.nodeCount || 0), 0) /
          Math.max(1, results.filter((r) => r.grammarDepth === "shallow" && r.success).length)
      ),
      avgSectionsDeep: Math.round(
        results
          .filter((r) => r.grammarDepth === "deep" && r.success)
          .reduce((sum, r) => sum + (r.variants?.[0]?.sectionCount || 0), 0) /
          Math.max(1, results.filter((r) => r.grammarDepth === "deep" && r.success).length)
      ),
      avgSectionsShallow: Math.round(
        results
          .filter((r) => r.grammarDepth === "shallow" && r.success)
          .reduce((sum, r) => sum + (r.variants?.[0]?.sectionCount || 0), 0) /
          Math.max(1, results.filter((r) => r.grammarDepth === "shallow" && r.success).length)
      ),
    },
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${outFile}`);

  // ── Gate assessment ───────────────────────────────────────────────────────

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  GATE ASSESSMENT (manual review required)");
  console.log("══════════════════════════════════════════════════════════\n");
  console.log("Review the generated DesignNode trees in the results JSON.");
  console.log("For each archetype, check:");
  console.log("  1. Does culture-brand output feel dark, photography-led, display type?");
  console.log("  2. Does creative-portfolio output feel light, spacious, asymmetric?");
  console.log("  3. Does premium-saas output use product primitives? (no regression)");
  console.log("  4. Does editorial-brand output feel magazine-like? (no regression)");
  console.log("  5. Are minimal-tech + experimental less differentiated?");
  console.log("\nTo visually inspect: paste each pageTree into the Studio OS canvas.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
