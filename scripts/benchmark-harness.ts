/**
 * Benchmark harness — Studio OS V5 Alpha
 *
 * Usage: npx tsx scripts/benchmark-harness.ts
 *
 * Phase 1 (this script): Image URL resolution + Taste extraction
 * Phase 2 (TODO):        Raw generation + Harnessed generation + Fidelity scoring
 *
 * Required env vars (in .env.local):
 *   OPENROUTER_API_KEY              — taste extraction via Sonnet 4.6
 *   PINTEREST_PERSONAL_ACCESS_TOKEN — board/pin image URL resolution
 *
 * Output: benchmark-results/preflight-<timestamp>.json
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
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

// ── Types ────────────────────────────────────────────────────────────────────

type BenchmarkReference = {
  id: string;
  title: string;
  source: string;
  urlType: "board" | "pin" | "live";
  url: string;
  pinTitle?: string;
  imageUrl: string;
  reason: string;
};

type BenchmarkSet = {
  id: string;
  benchmarkPackId: string;
  name: string;
  category: string;
  difficulty: string;
  prompt: string;
  brief: string;
  tasteDirection: {
    typography: string;
    palette: string;
    density: string;
    corners: string;
    mood: string[];
    avoid: string[];
  };
  successNotes: string[];
  knownRisks: string[];
  references: BenchmarkReference[];
};

type BenchmarkSetsFile = {
  version: string;
  sets: BenchmarkSet[];
};

type SetResult = {
  setId: string;
  name: string;
  resolvedCount: number;
  totalCount: number;
  resolvedUrls: string[];
  blockedRefs: string[];
  tasteProfile: Record<string, unknown> | null;
  status: "complete" | "partial" | "blocked";
  nextStep: string;
};

// ── Pinterest helpers (standalone — no Supabase dependency) ──────────────────

const PINTEREST_API = "https://api.pinterest.com/v5";

type PinterestBoard = { id: string; name: string; pin_count: number };
type PinterestPinMedia = {
  original?: { url: string };
  "1200x"?: { url: string };
  "600x"?: { url: string };
  "400x300"?: { url: string };
};
type PinterestPin = {
  id: string;
  title?: string;
  description?: string;
  media?: { images?: PinterestPinMedia };
};

function pinImageUrl(pin: PinterestPin): string | null {
  const imgs = pin.media?.images;
  if (!imgs) return null;
  return (
    imgs["1200x"]?.url ??
    imgs.original?.url ??
    imgs["600x"]?.url ??
    imgs["400x300"]?.url ??
    null
  );
}

async function listBoards(token: string): Promise<PinterestBoard[]> {
  const res = await fetch(`${PINTEREST_API}/boards?page_size=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pinterest boards ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { items: PinterestBoard[] };
  return data.items;
}

async function fetchBoardPins(
  boardId: string,
  token: string,
  limit = 100
): Promise<PinterestPin[]> {
  const pins: PinterestPin[] = [];
  let bookmark: string | undefined;

  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (bookmark) params.set("bookmark", bookmark);

    const res = await fetch(`${PINTEREST_API}/boards/${boardId}/pins?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Pinterest board pins ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      items: PinterestPin[];
      bookmark?: string;
    };
    pins.push(...data.items.filter((p) => pinImageUrl(p) !== null));
    bookmark = data.bookmark;
  } while (bookmark && pins.length < limit);

  return pins.slice(0, limit);
}

// ── OG:Image resolver ────────────────────────────────────────────────────────

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StudioOS-Benchmark/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return ogMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

// ── Board pin cache ───────────────────────────────────────────────────────────

type BoardPinCache = Map<string, PinterestPin[]>;

async function resolveBoardRef(
  ref: BenchmarkReference,
  token: string,
  boards: PinterestBoard[],
  cache: BoardPinCache
): Promise<string | null> {
  // Extract board slug from URL like https://www.pinterest.com/litterthanli7/web/
  const urlMatch = ref.url.match(/pinterest\.com\/[^/]+\/([^/]+)\//);
  if (!urlMatch) return null;
  const boardSlug = urlMatch[1].toLowerCase();

  const board = boards.find(
    (b) =>
      b.name.toLowerCase() === boardSlug ||
      b.name.toLowerCase().replace(/\s+/g, "-") === boardSlug
  );

  if (!board) {
    process.stdout.write(
      `✗ board "${boardSlug}" not found (available: ${boards.map((b) => b.name).join(", ")})\n`
    );
    return null;
  }

  if (!cache.has(board.id)) {
    process.stdout.write(`→ fetching pins from "${board.name}"... `);
    const pins = await fetchBoardPins(board.id, token);
    cache.set(board.id, pins);
    process.stdout.write(`${pins.length} pins loaded\n    `);
  }

  const pins = cache.get(board.id) ?? [];
  const pinTitle = ref.pinTitle?.toLowerCase().trim();

  if (!pinTitle) {
    const first = pins[0];
    if (first) {
      process.stdout.write("✓ first pin (no title to match)\n");
      return pinImageUrl(first);
    }
    process.stdout.write("✗ board empty\n");
    return null;
  }

  // Fuzzy title match: exact substring, or significant word overlap
  const words = pinTitle.split(/\s+/).filter((w) => w.length > 3);
  const match = pins.find((p) => {
    const title = (p.title ?? "").toLowerCase();
    const desc = (p.description ?? "").toLowerCase();
    return (
      title.includes(pinTitle) ||
      pinTitle.includes(title.slice(0, 20)) ||
      desc.includes(pinTitle) ||
      words.some((w) => title.includes(w))
    );
  });

  if (match) {
    process.stdout.write(`✓ matched "${match.title?.slice(0, 35) ?? "(untitled)"}"\n`);
    return pinImageUrl(match);
  }

  process.stdout.write(`✗ no match for "${ref.pinTitle}" in ${pins.length} pins\n`);
  return null;
}

// ── Taste extraction (inline — no HTTP server dependency) ────────────────────

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const SONNET_4_6_MODEL = "anthropic/claude-sonnet-4-6";

function buildTasteSystemPrompt(): string {
  return `You are the Taste Engine for Studio OS — a reference-informed design intelligence system.
Analyze visual references and return a structured TasteProfile JSON that drives website generation.

Archetypes: premium-saas | editorial-brand | minimal-tech | creative-portfolio | culture-brand | experimental

Rules:
1. Be specific and opinionated — generic output is a failure
2. Provide REAL hex color values derived from the references
3. Recommend specific font pairings by name (e.g. "Inter + Newsreader")
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
  "layoutBias": {
    "density": "spacious|balanced|dense",
    "rhythm": "alternating|sequential|asymmetric|magazine",
    "heroStyle": "full-bleed|split|text-dominant|contained",
    "sectionFlow": "stacked|alternating|magazine",
    "gridBehavior": "strict|fluid|broken|editorial",
    "whitespaceIntent": "structural|decorative|minimal"
  },
  "typographyTraits": {
    "scale": "condensed|normal|expanded",
    "headingTone": "geometric|humanist|editorial|technical|expressive",
    "bodyTone": "neutral|editorial|minimal",
    "contrast": "low|medium|high",
    "casePreference": "lower|mixed|upper|title",
    "recommendedPairings": string[2]
  },
  "colorBehavior": {
    "mode": "light|dark|mixed",
    "palette": "monochrome|neutral-plus-accent|full-color",
    "accentStrategy": "single-pop|gradient-bold|no-accent",
    "saturation": "muted|vivid|saturated",
    "temperature": "warm|cool|neutral",
    "suggestedColors": {
      "background": hex,
      "surface": hex,
      "text": hex,
      "accent": hex,
      "secondary": hex
    }
  },
  "imageTreatment": {
    "style": "editorial|product|atmospheric|none",
    "sizing": "full-bleed|hero-scale|contained|thumbnail",
    "treatment": "raw|duotone|grayscale|tinted",
    "cornerRadius": "none|subtle|rounded",
    "borders": boolean,
    "shadow": "none|subtle|dramatic",
    "aspectPreference": "portrait|landscape|square|mixed"
  },
  "ctaTone": {
    "style": "bold|understated|ghost|inline",
    "shape": "sharp|subtle-radius|pill",
    "hierarchy": "primary-dominant|balanced|minimal"
  },
  "avoid": string[5],
  "confidence": number,
  "referenceCount": number,
  "dominantReferenceType": "ui-screenshot|poster|photography|mixed",
  "warnings": string[]
}`;
}

type OpenRouterImageBlock = {
  type: "image_url";
  image_url: { url: string; detail: "low" | "high" };
};

type OpenRouterTextBlock = {
  type: "text";
  text: string;
};

async function extractTaste(
  setId: string,
  imageUrls: string[],
  apiKey: string
): Promise<Record<string, unknown>> {
  const imageContent: OpenRouterImageBlock[] = imageUrls.slice(0, 5).map((url) => ({
    type: "image_url",
    image_url: { url, detail: "low" },
  }));

  const textBlock: OpenRouterTextBlock = {
    type: "text",
    text: `Analyze these ${imageUrls.length} visual references for benchmark set ${setId}. Return compact TasteProfile JSON only.`,
  };

  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SONNET_4_6_MODEL,
      max_tokens: 2600,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildTasteSystemPrompt() },
        {
          role: "user",
          content: [textBlock, ...imageContent],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string }; finish_reason: string }>;
  };
  const text = data.choices[0]?.message?.content ?? "{}";
  const finishReason = data.choices[0]?.finish_reason;
  if (finishReason === "length") {
    console.warn("    ⚠ Sonnet hit max_tokens — response may be truncated");
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function runBenchmark(): Promise<void> {
  console.log("=== Studio OS Benchmark Harness — V5 Alpha ===\n");
  console.log(`Date: ${new Date().toISOString()}\n`);

  // ── Preflight ──────────────────────────────────────────────────────────────
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const pinterestToken = process.env.PINTEREST_PERSONAL_ACCESS_TOKEN;

  console.log("── Preflight ──────────────────────────────────────────────────────────");
  console.log(`  OPENROUTER_API_KEY:              ${openRouterKey ? "✓ set" : "✗ MISSING"}`);
  console.log(`  PINTEREST_PERSONAL_ACCESS_TOKEN: ${pinterestToken ? "✓ set" : "✗ missing"}`);
  console.log();

  // ── Load benchmark sets ────────────────────────────────────────────────────
  const setsPath = path.join(process.cwd(), "benchmark-sets.json");
  if (!fs.existsSync(setsPath)) {
    console.error("❌ benchmark-sets.json not found — run from the studio-os root directory.");
    process.exit(1);
  }

  const setsFile = JSON.parse(
    fs.readFileSync(setsPath, "utf-8")
  ) as BenchmarkSetsFile;
  const sets = setsFile.sets;
  console.log(`Loaded ${sets.length} benchmark sets: ${sets.map((s) => s.id).join(", ")}\n`);

  // ── Pinterest board cache ──────────────────────────────────────────────────
  let pinterestBoards: PinterestBoard[] = [];
  const boardPinCache: BoardPinCache = new Map();

  if (pinterestToken) {
    try {
      console.log("── Pinterest Boards ────────────────────────────────────────────────────");
      pinterestBoards = await listBoards(pinterestToken);
      console.log(
        `  Found ${pinterestBoards.length} boards: ${pinterestBoards.map((b) => b.name).join(", ")}\n`
      );
    } catch (err) {
      console.error(
        `  Pinterest board fetch failed: ${err instanceof Error ? err.message : String(err)}`
      );
      console.log("  Board/pin refs will be skipped.\n");
    }
  }

  // ── Process each set ───────────────────────────────────────────────────────
  const results: SetResult[] = [];

  for (const set of sets) {
    const sep = "─".repeat(Math.max(2, 64 - set.id.length - set.name.length));
    console.log(`── ${set.id}: ${set.name} ${sep}`);

    const resolvedUrls: string[] = [];
    const blockedRefs: string[] = [];

    for (const ref of set.references) {
      const label = `${ref.id}`.padEnd(12);
      process.stdout.write(`  [${label}] ${ref.title.slice(0, 38).padEnd(38)} `);

      // Already resolved
      if (ref.imageUrl && ref.imageUrl !== "TODO") {
        process.stdout.write("✓ pre-resolved\n");
        resolvedUrls.push(ref.imageUrl);
        continue;
      }

      let resolved: string | null = null;
      try {
        if (ref.urlType === "live") {
          resolved = await fetchOgImage(ref.url);
          process.stdout.write(resolved ? "✓ og:image\n" : "✗ no og:image\n");
        } else if (ref.urlType === "pin") {
          // Pinterest pin page: og:image usually has the pin's image
          resolved = await fetchOgImage(ref.url);
          process.stdout.write(resolved ? "✓ pin og:image\n" : "✗ pin page unavailable\n");
        } else if (ref.urlType === "board") {
          if (!pinterestToken) {
            process.stdout.write("✗ PINTEREST_PERSONAL_ACCESS_TOKEN not set\n");
          } else if (pinterestBoards.length === 0) {
            process.stdout.write("✗ board list unavailable\n");
          } else {
            resolved = await resolveBoardRef(
              ref,
              pinterestToken,
              pinterestBoards,
              boardPinCache
            );
          }
        }
      } catch (err) {
        process.stdout.write(
          `✗ error: ${err instanceof Error ? err.message.slice(0, 60) : String(err)}\n`
        );
      }

      if (resolved) {
        resolvedUrls.push(resolved);
      } else {
        blockedRefs.push(ref.id);
      }
    }

    const resolvedCount = resolvedUrls.length;
    const totalCount = set.references.length;
    const pct = Math.round((resolvedCount / totalCount) * 100);

    console.log(`\n  Resolved: ${resolvedCount}/${totalCount} (${pct}%)`);
    if (blockedRefs.length > 0) {
      console.log(`  Blocked:  ${blockedRefs.join(", ")}`);
    }

    // ── Taste extraction ────────────────────────────────────────────────────
    let tasteProfile: Record<string, unknown> | null = null;
    let status: "complete" | "partial" | "blocked" = "blocked";
    let nextStep: string;

    if (!openRouterKey) {
      console.log("  Taste extraction: skipped (no OPENROUTER_API_KEY)");
      nextStep = "set OPENROUTER_API_KEY in .env.local";
    } else if (resolvedCount < 3) {
      console.log(
        `  Taste extraction: skipped (${resolvedCount} refs — need ≥3)`
      );
      nextStep = "resolve more image URLs (need ≥3)";
    } else {
      process.stdout.write(
        `  Taste extraction: calling Sonnet 4.6 with ${resolvedCount} images... `
      );
      try {
        tasteProfile = await extractTaste(set.id, resolvedUrls, openRouterKey);
        status = resolvedCount === totalCount ? "complete" : "partial";
        process.stdout.write(
          `✓ archetype=${tasteProfile.archetypeMatch}, confidence=${tasteProfile.confidence}\n`
        );
        nextStep =
          status === "complete"
            ? "wire generateSite() for raw vs harnessed generation"
            : "resolve blocked refs, then re-run for full taste signal";
      } catch (err) {
        process.stdout.write(
          `✗ ${err instanceof Error ? err.message.slice(0, 80) : String(err)}\n`
        );
        status = "partial";
        nextStep = "fix taste extraction error, then retry";
      }
    }

    results.push({
      setId: set.id,
      name: set.name,
      resolvedCount,
      totalCount,
      resolvedUrls,
      blockedRefs,
      tasteProfile,
      status,
      nextStep,
    });

    console.log();
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("── Summary ────────────────────────────────────────────────────────────");
  for (const r of results) {
    const icon = r.status === "complete" ? "✓" : r.status === "partial" ? "⚡" : "✗";
    const tasteStr = r.tasteProfile ? ` archetype=${r.tasteProfile.archetypeMatch}` : " (no taste)";
    console.log(
      `  ${icon} ${r.setId.padEnd(7)} ${r.name.padEnd(22)} ${r.resolvedCount}/${r.totalCount} refs${tasteStr}`
    );
  }

  // ── What remains ──────────────────────────────────────────────────────────
  console.log("\n── Phase 2 blockers (generation + scoring) ────────────────────────────");

  const tasteReady = results.filter((r) => r.tasteProfile !== null);
  if (tasteReady.length > 0) {
    console.log(`\n  Taste profiles ready: ${tasteReady.map((r) => r.setId).join(", ")}`);
    console.log("  To run Phase 2:");
    console.log("    1. Extract generateSite() from lib/canvas/generate-site.ts");
    console.log("       OR run dev server and call POST /api/generate");
    console.log("    2. Call generateSite(brief, null, tokens)         → rawSite");
    console.log("    3. Call generateSite(brief, tasteProfile, tokens) → harnessedSite");
    console.log("    4. scoreRealtimeFidelity(rawSite.pageTree, tasteProfile)       → rawScore");
    console.log("    5. scoreRealtimeFidelity(harnessedSite.pageTree, tasteProfile) → score");
    console.log("    6. Diff: harnessedScore.overall - rawScore.overall = taste delta");
  }

  const stillBlocked = results.filter((r) => r.status === "blocked");
  if (stillBlocked.length > 0) {
    console.log("\n  Still blocked:");
    for (const r of stillBlocked) {
      console.log(`    ${r.setId}: ${r.nextStep}`);
      if (r.blockedRefs.length > 0) {
        console.log(`      unresolved refs: ${r.blockedRefs.join(", ")}`);
      }
    }
    if (!pinterestToken) {
      console.log(
        "\n  → Set PINTEREST_PERSONAL_ACCESS_TOKEN in .env.local to resolve board/pin refs"
      );
    }
    if (!openRouterKey) {
      console.log("\n  → Set OPENROUTER_API_KEY in .env.local to run taste extraction");
    }
  }

  // ── Write output ───────────────────────────────────────────────────────────
  const outDir = path.join(process.cwd(), "benchmark-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(outDir, `preflight-${timestamp}.json`);

  const output = {
    timestamp: new Date().toISOString(),
    phase: "preflight-taste-extraction",
    version: setsFile.version,
    env: {
      openRouterKeySet: !!openRouterKey,
      pinterestTokenSet: !!pinterestToken,
    },
    summary: {
      total: results.length,
      complete: results.filter((r) => r.status === "complete").length,
      partial: results.filter((r) => r.status === "partial").length,
      blocked: results.filter((r) => r.status === "blocked").length,
    },
    sets: results.map((r) => ({
      setId: r.setId,
      name: r.name,
      resolvedCount: r.resolvedCount,
      totalCount: r.totalCount,
      blockedRefs: r.blockedRefs,
      status: r.status,
      nextStep: r.nextStep,
      tasteProfile: r.tasteProfile,
      // resolvedUrls omitted from output (can be long CDN URLs)
    })),
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Output written: benchmark-results/preflight-${timestamp}.json`);
  console.log("\n=== Benchmark preflight complete ===");
}

runBenchmark().catch((err: unknown) => {
  console.error("\n❌ Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
