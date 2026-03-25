/**
 * Benchmark harness — Studio OS V5 Alpha
 *
 * Usage:
 *   npx tsx scripts/benchmark-harness.ts                 # Full benchmark (Phase 1 + Phase 2)
 *   npx tsx scripts/benchmark-harness.ts --preflight     # Phase 1 only (image resolution + taste extraction)
 *
 * Phase 1: Image URL resolution + Taste extraction (standalone, no dev server needed)
 * Phase 2: Raw generation + Harnessed generation + Fidelity scoring (needs dev server running)
 *
 * Required env vars (in .env.local):
 *   OPENROUTER_API_KEY              — taste extraction via Sonnet 4.6
 *
 * Optional env vars:
 *   PINTEREST_PERSONAL_ACCESS_TOKEN — board/pin image URL resolution (only if sets have unresolved refs)
 *   BENCHMARK_PORT                  — dev server port (default: 3000)
 *
 * Output:
 *   Phase 1: benchmark-results/preflight-<timestamp>.json
 *   Phase 2: benchmark-results/benchmark-<timestamp>.json
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

// ── CLI args ─────────────────────────────────────────────────────────────────

const PREFLIGHT_ONLY = process.argv.includes("--preflight");
const DEV_PORT = process.env.BENCHMARK_PORT || "3000";
const DEV_BASE = `http://localhost:${DEV_PORT}`;

// ── Types ────────────────────────────────────────────────────────────────────

type BenchmarkReference = {
  id: string;
  title: string;
  source: string;
  urlType?: "board" | "pin" | "live";
  url?: string;
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

type TasteFidelityScore = {
  palette: number;
  typography: number;
  density: number;
  structure: number;
  overall: number;
  justification: string;
  mode: string;
  timestamp: string;
};

type VariantResult = {
  name: string;
  pageTreeSource: "ai" | "template" | "repaired";
  validationScore?: number;
  fidelityScore: TasteFidelityScore | null;
  pageTree: Record<string, unknown>;
};

type SetPhase1Result = {
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

type SetBenchmarkResult = {
  setId: string;
  name: string;
  category: string;
  rawVariantA: {
    source: string;
    fidelityScore: TasteFidelityScore | null;
  };
  harnessedVariantA: {
    source: string;
    fidelityScore: TasteFidelityScore | null;
  };
  delta: {
    palette: number;
    typography: number;
    density: number;
    structure: number;
    overall: number;
  } | null;
};

// ── Neutral design tokens for benchmark ──────────────────────────────────────
// Used for both raw and harnessed generation so the only variable is the harness.

const NEUTRAL_TOKENS = {
  colors: {
    primary: "#111111",
    secondary: "#555555",
    accent: "#2563EB",
    background: "#FFFFFF",
    surface: "#F5F5F5",
    text: "#111111",
    textMuted: "#6B7280",
    border: "#E5E7EB",
  },
  typography: {
    fontFamily: "Inter",
    scale: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px",
    },
    weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: "1.25", normal: "1.5", relaxed: "1.75" },
  },
  spacing: {
    unit: 4,
    scale: {
      "1": "4px",
      "2": "8px",
      "3": "12px",
      "4": "16px",
      "6": "24px",
      "8": "32px",
      "12": "48px",
      "16": "64px",
    },
  },
  radii: { sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.05)",
    md: "0 4px 6px rgba(0,0,0,0.1)",
    lg: "0 10px 15px rgba(0,0,0,0.1)",
  },
  animation: {
    spring: {
      smooth: { stiffness: 200, damping: 25 },
      snappy: { stiffness: 300, damping: 30 },
      gentle: { stiffness: 150, damping: 20 },
      bouncy: { stiffness: 400, damping: 10 },
    },
  },
};

// ── Image helpers ────────────────────────────────────────────────────────────

/**
 * Convert a local file path to a base64 data URI for sending to vision models.
 * Returns the URL as-is if it's already an HTTP(S) or data URI.
 */
function toSendableUrl(imageRef: string): string {
  if (
    imageRef.startsWith("http://") ||
    imageRef.startsWith("https://") ||
    imageRef.startsWith("data:")
  ) {
    return imageRef;
  }

  // Local file — convert to base64 data URI
  const absPath = path.resolve(process.cwd(), imageRef);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Local image not found: ${absPath}`);
  }
  const ext = path.extname(absPath).toLowerCase().replace(".", "");
  const mimeType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
      ? "image/png"
      : "image/webp";
  const base64 = fs.readFileSync(absPath).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

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

    const res = await fetch(
      `${PINTEREST_API}/boards/${boardId}/pins?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
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
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StudioOS-Benchmark/1.0)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      );
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
  const urlMatch = ref.url?.match(/pinterest\.com\/[^/]+\/([^/]+)\//);
  if (!urlMatch) return null;
  const boardSlug = urlMatch[1].toLowerCase();

  const board = boards.find(
    (b) =>
      b.name.toLowerCase() === boardSlug ||
      b.name.toLowerCase().replace(/\s+/g, "-") === boardSlug
  );

  if (!board) {
    process.stdout.write(
      `✗ board "${boardSlug}" not found (available: ${boards
        .map((b) => b.name)
        .join(", ")})\n`
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
    process.stdout.write(
      `✓ matched "${match.title?.slice(0, 35) ?? "(untitled)"}"\n`
    );
    return pinImageUrl(match);
  }

  process.stdout.write(
    `✗ no match for "${ref.pinTitle}" in ${pins.length} pins\n`
  );
  return null;
}

// ── Taste extraction (standalone — no HTTP server dependency) ─────────────────

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
  // Convert local paths to base64 data URIs
  const sendableUrls = imageUrls.slice(0, 5).map(toSendableUrl);

  const imageContent: OpenRouterImageBlock[] = sendableUrls.map((url) => ({
    type: "image_url",
    image_url: { url, detail: "low" },
  }));

  const textBlock: OpenRouterTextBlock = {
    type: "text",
    text: `Analyze these ${sendableUrls.length} visual references for benchmark set ${setId}. Return compact TasteProfile JSON only.`,
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
    choices: Array<{
      message: { content: string };
      finish_reason: string;
    }>;
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

// ── Phase 2: Dev server API calls ────────────────────────────────────────────

async function checkDevServer(): Promise<boolean> {
  try {
    const res = await fetch(DEV_BASE, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok || res.status === 404 || res.status === 307;
  } catch {
    return false;
  }
}

async function generateVariants(
  brief: string,
  tasteProfile: Record<string, unknown> | null,
  referenceUrls: string[]
): Promise<{
  siteName: string;
  variants: VariantResult[];
} | null> {
  // Convert local paths to sendable URLs (base64 data URIs)
  const sendableRefs = tasteProfile
    ? referenceUrls.slice(0, 4).map(toSendableUrl)
    : [];

  const body = {
    prompt: brief,
    tokens: NEUTRAL_TOKENS,
    mode: "variants" as const,
    tasteProfile: tasteProfile ?? null,
    referenceUrls: sendableRefs,
    fidelityMode: tasteProfile ? "balanced" : undefined,
    useDesignNode: true,
  };

  try {
    const res = await fetch(`${DEV_BASE}/api/canvas/generate-component`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000), // 5 min timeout for generation (V6 DesignNode is larger)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`    ✗ Generation failed (${res.status}): ${errBody.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as {
      siteName: string;
      variants: VariantResult[];
    };
    return data;
  } catch (err) {
    console.error(
      `    ✗ Generation error: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

async function scorePageTree(
  pageTree: Record<string, unknown>,
  tasteProfile: Record<string, unknown>
): Promise<TasteFidelityScore | null> {
  try {
    const res = await fetch(`${DEV_BASE}/api/benchmark/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageTree, tasteProfile }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`    ✗ Scoring failed (${res.status}): ${errBody.slice(0, 200)}`);
      return null;
    }

    return (await res.json()) as TasteFidelityScore;
  } catch (err) {
    console.error(
      `    ✗ Scoring error: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

function computeDelta(
  raw: TasteFidelityScore | null,
  harnessed: TasteFidelityScore | null
): SetBenchmarkResult["delta"] {
  if (!raw || !harnessed) return null;
  return {
    palette: Math.round((harnessed.palette - raw.palette) * 10) / 10,
    typography: Math.round((harnessed.typography - raw.typography) * 10) / 10,
    density: Math.round((harnessed.density - raw.density) * 10) / 10,
    structure: Math.round((harnessed.structure - raw.structure) * 10) / 10,
    overall: Math.round((harnessed.overall - raw.overall) * 10) / 10,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function runBenchmark(): Promise<void> {
  console.log("=== Studio OS Benchmark Harness — V5 Alpha ===\n");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Mode: ${PREFLIGHT_ONLY ? "preflight only" : "full benchmark"}\n`);

  // ── Preflight ──────────────────────────────────────────────────────────────
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const pinterestToken = process.env.PINTEREST_PERSONAL_ACCESS_TOKEN;

  console.log(
    "── Preflight ──────────────────────────────────────────────────────────"
  );
  console.log(
    `  OPENROUTER_API_KEY:              ${openRouterKey ? "✓ set" : "✗ MISSING"}`
  );
  console.log(
    `  PINTEREST_PERSONAL_ACCESS_TOKEN: ${pinterestToken ? "✓ set" : "✗ missing (board refs will be skipped)"}`
  );
  console.log();

  if (!openRouterKey) {
    console.error("❌ OPENROUTER_API_KEY is required. Set it in .env.local.");
    process.exit(1);
  }

  // ── Load benchmark sets ────────────────────────────────────────────────────
  const setsPath = path.join(process.cwd(), "benchmark-sets.json");
  if (!fs.existsSync(setsPath)) {
    console.error(
      "❌ benchmark-sets.json not found — run from the studio-os root directory."
    );
    process.exit(1);
  }

  const setsFile = JSON.parse(
    fs.readFileSync(setsPath, "utf-8")
  ) as BenchmarkSetsFile;
  const sets = setsFile.sets;
  console.log(
    `Loaded ${sets.length} benchmark sets: ${sets.map((s) => s.id).join(", ")}\n`
  );

  // ── Pinterest board cache ──────────────────────────────────────────────────
  let pinterestBoards: PinterestBoard[] = [];
  const boardPinCache: BoardPinCache = new Map();

  // Only fetch boards if any set has unresolved board refs
  const hasUnresolvedBoardRefs = sets.some((s) =>
    s.references.some(
      (r) => r.urlType === "board" && (!r.imageUrl || r.imageUrl === "TODO")
    )
  );

  if (pinterestToken && hasUnresolvedBoardRefs) {
    try {
      console.log(
        "── Pinterest Boards ────────────────────────────────────────────────────"
      );
      pinterestBoards = await listBoards(pinterestToken);
      console.log(
        `  Found ${pinterestBoards.length} boards: ${pinterestBoards
          .map((b) => b.name)
          .join(", ")}\n`
      );
    } catch (err) {
      console.error(
        `  Pinterest board fetch failed: ${err instanceof Error ? err.message : String(err)}`
      );
      console.log("  Board/pin refs will be skipped.\n");
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1: Image Resolution + Taste Extraction
  // ══════════════════════════════════════════════════════════════════════════

  console.log(
    "══ Phase 1: Image Resolution + Taste Extraction ═══════════════════════\n"
  );

  const phase1Results: SetPhase1Result[] = [];

  for (const set of sets) {
    const sep = "─".repeat(
      Math.max(2, 64 - set.id.length - set.name.length)
    );
    console.log(`── ${set.id}: ${set.name} ${sep}`);

    const resolvedUrls: string[] = [];
    const blockedRefs: string[] = [];

    for (const ref of set.references) {
      const label = `${ref.id}`.padEnd(12);
      process.stdout.write(
        `  [${label}] ${ref.title.slice(0, 38).padEnd(38)} `
      );

      // Already resolved (local path or URL)
      if (ref.imageUrl && ref.imageUrl !== "TODO") {
        // Verify local file exists
        if (
          !ref.imageUrl.startsWith("http") &&
          !ref.imageUrl.startsWith("data:")
        ) {
          const absPath = path.resolve(process.cwd(), ref.imageUrl);
          if (!fs.existsSync(absPath)) {
            process.stdout.write(`✗ local file missing: ${absPath}\n`);
            blockedRefs.push(ref.id);
            continue;
          }
        }
        process.stdout.write("✓ pre-resolved\n");
        resolvedUrls.push(ref.imageUrl);
        continue;
      }

      let resolved: string | null = null;
      try {
        if (ref.urlType === "live") {
          resolved = await fetchOgImage(ref.url!);
          process.stdout.write(
            resolved ? "✓ og:image\n" : "✗ no og:image\n"
          );
        } else if (ref.urlType === "pin") {
          resolved = await fetchOgImage(ref.url!);
          process.stdout.write(
            resolved ? "✓ pin og:image\n" : "✗ pin page unavailable\n"
          );
        } else if (ref.urlType === "board") {
          if (!pinterestToken) {
            process.stdout.write(
              "✗ PINTEREST_PERSONAL_ACCESS_TOKEN not set\n"
            );
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

    if (resolvedCount < 3) {
      console.log(
        `  Taste extraction: skipped (${resolvedCount} refs — need ≥3)`
      );
      nextStep = "resolve more image URLs (need ≥3)";
    } else {
      process.stdout.write(
        `  Taste extraction: calling Sonnet 4.6 with ${resolvedCount} images... `
      );
      try {
        tasteProfile = await extractTaste(
          set.id,
          resolvedUrls,
          openRouterKey
        );
        status = resolvedCount === totalCount ? "complete" : "partial";
        process.stdout.write(
          `✓ archetype=${tasteProfile.archetypeMatch}, confidence=${tasteProfile.confidence}\n`
        );
        nextStep =
          status === "complete"
            ? "ready for Phase 2"
            : "resolve blocked refs for full taste signal, but can run Phase 2";
      } catch (err) {
        process.stdout.write(
          `✗ ${err instanceof Error ? err.message.slice(0, 80) : String(err)}\n`
        );
        status = "partial";
        nextStep = "fix taste extraction error, then retry";
      }
    }

    phase1Results.push({
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

  // ── Phase 1 Summary ──
  console.log(
    "── Phase 1 Summary ────────────────────────────────────────────────────"
  );
  for (const r of phase1Results) {
    const icon =
      r.status === "complete"
        ? "✓"
        : r.status === "partial"
        ? "⚡"
        : "✗";
    const tasteStr = r.tasteProfile
      ? ` archetype=${r.tasteProfile.archetypeMatch}`
      : " (no taste)";
    console.log(
      `  ${icon} ${r.setId.padEnd(7)} ${r.name.padEnd(22)} ${r.resolvedCount}/${r.totalCount} refs${tasteStr}`
    );
  }

  // ── Write Phase 1 output ──
  const outDir = path.join(process.cwd(), "benchmark-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const preflightPath = path.join(
    outDir,
    `preflight-${timestamp}.json`
  );

  const preflightOutput = {
    timestamp: new Date().toISOString(),
    phase: "preflight-taste-extraction",
    version: setsFile.version,
    env: {
      openRouterKeySet: true,
      pinterestTokenSet: !!pinterestToken,
    },
    summary: {
      total: phase1Results.length,
      complete: phase1Results.filter((r) => r.status === "complete").length,
      partial: phase1Results.filter((r) => r.status === "partial").length,
      blocked: phase1Results.filter((r) => r.status === "blocked").length,
    },
    sets: phase1Results.map((r) => ({
      setId: r.setId,
      name: r.name,
      resolvedCount: r.resolvedCount,
      totalCount: r.totalCount,
      blockedRefs: r.blockedRefs,
      status: r.status,
      nextStep: r.nextStep,
      tasteProfile: r.tasteProfile,
    })),
  };

  fs.writeFileSync(preflightPath, JSON.stringify(preflightOutput, null, 2));
  console.log(
    `\n✓ Phase 1 output: benchmark-results/preflight-${timestamp}.json`
  );

  if (PREFLIGHT_ONLY) {
    console.log("\n=== Preflight complete (--preflight flag set) ===");
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2: Generation + Scoring + Comparison
  // ══════════════════════════════════════════════════════════════════════════

  const setsWithTaste = phase1Results.filter((r) => r.tasteProfile !== null);
  if (setsWithTaste.length === 0) {
    console.log(
      "\n⚠ No sets have taste profiles — cannot run Phase 2. Fix image resolution and retry."
    );
    return;
  }

  console.log(
    `\n══ Phase 2: Generation + Scoring ═══════════════════════════════════════`
  );
  console.log(
    `  Sets ready: ${setsWithTaste.map((s) => s.setId).join(", ")}\n`
  );

  // ── Check dev server ──
  process.stdout.write(`  Checking dev server at ${DEV_BASE}... `);
  const serverUp = await checkDevServer();
  if (!serverUp) {
    console.log("✗ NOT RUNNING");
    console.log(
      `\n❌ Dev server must be running for Phase 2. Start it with: npm run dev`
    );
    console.log(`   Then re-run: npx tsx scripts/benchmark-harness.ts`);
    return;
  }
  console.log("✓ running\n");

  const benchmarkResults: SetBenchmarkResult[] = [];

  for (const p1 of setsWithTaste) {
    const set = sets.find((s) => s.id === p1.setId)!;
    const sep = "─".repeat(
      Math.max(2, 64 - set.id.length - set.name.length)
    );
    console.log(`── ${set.id}: ${set.name} ${sep}`);
    console.log(`  Brief: "${set.brief.slice(0, 80)}..."`);
    console.log(
      `  Taste: ${p1.tasteProfile!.archetypeMatch} (confidence: ${p1.tasteProfile!.confidence})`
    );

    // ── Step 1: RAW generation (no taste, no references) ──
    process.stdout.write("  [RAW]       Generating variants (no taste)... ");
    const rawResult = await generateVariants(set.brief, null, []);

    if (!rawResult) {
      console.log("FAILED — skipping set");
      benchmarkResults.push({
        setId: set.id,
        name: set.name,
        category: set.category,
        rawVariantA: { source: "failed", fidelityScore: null },
        harnessedVariantA: { source: "skipped", fidelityScore: null },
        delta: null,
      });
      continue;
    }

    const rawA = rawResult.variants[0];
    console.log(`✓ source=${rawA.pageTreeSource}`);

    // ── Step 2: HARNESSED generation (with taste + references) ──
    process.stdout.write(
      "  [HARNESSED] Generating variants (with taste)... "
    );
    const harnessedResult = await generateVariants(
      set.brief,
      p1.tasteProfile,
      p1.resolvedUrls
    );

    if (!harnessedResult) {
      console.log("FAILED — skipping set");
      benchmarkResults.push({
        setId: set.id,
        name: set.name,
        category: set.category,
        rawVariantA: {
          source: rawA.pageTreeSource,
          fidelityScore: null,
        },
        harnessedVariantA: { source: "failed", fidelityScore: null },
        delta: null,
      });
      continue;
    }

    const harnessedA = harnessedResult.variants[0];
    console.log(
      `✓ source=${harnessedA.pageTreeSource}`
    );

    // ── Step 3: Score RAW Variant A against taste profile ──
    process.stdout.write("  [SCORE RAW] Scoring raw output vs taste... ");
    const rawScore = await scorePageTree(
      rawA.pageTree as Record<string, unknown>,
      p1.tasteProfile!
    );

    if (rawScore) {
      console.log(
        `✓ palette=${rawScore.palette} type=${rawScore.typography} density=${rawScore.density} struct=${rawScore.structure} overall=${rawScore.overall}`
      );
    } else {
      console.log("✗ scoring failed");
    }

    // ── Step 4: Get harnessed score (already in response, or score if missing) ──
    let harnessedScore = harnessedA.fidelityScore;
    if (!harnessedScore) {
      process.stdout.write(
        "  [SCORE HAR] Scoring harnessed output vs taste... "
      );
      harnessedScore = await scorePageTree(
        harnessedA.pageTree as Record<string, unknown>,
        p1.tasteProfile!
      );
      if (harnessedScore) {
        console.log(
          `✓ palette=${harnessedScore.palette} type=${harnessedScore.typography} density=${harnessedScore.density} struct=${harnessedScore.structure} overall=${harnessedScore.overall}`
        );
      } else {
        console.log("✗ scoring failed");
      }
    } else {
      console.log(
        `  [SCORE HAR] From generation: palette=${harnessedScore.palette} type=${harnessedScore.typography} density=${harnessedScore.density} struct=${harnessedScore.structure} overall=${harnessedScore.overall}`
      );
    }

    // ── Step 5: Compute delta ──
    const delta = computeDelta(rawScore, harnessedScore);
    if (delta) {
      const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
      console.log(
        `  [DELTA]     palette=${sign(delta.palette)} type=${sign(delta.typography)} density=${sign(delta.density)} struct=${sign(delta.structure)} overall=${sign(delta.overall)}`
      );
    }

    benchmarkResults.push({
      setId: set.id,
      name: set.name,
      category: set.category,
      rawVariantA: {
        source: rawA.pageTreeSource,
        fidelityScore: rawScore,
      },
      harnessedVariantA: {
        source: harnessedA.pageTreeSource,
        fidelityScore: harnessedScore,
      },
      delta,
    });

    console.log();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════════════════════════════════════════

  console.log(
    "══ Benchmark Results ═══════════════════════════════════════════════════\n"
  );

  // ── Per-set table ──
  console.log(
    "  Set           Category          Raw    Harnessed  Delta"
  );
  console.log(
    "  ─────────────────────────────────────────────────────────────────"
  );

  const validDeltas: SetBenchmarkResult["delta"][] = [];

  for (const r of benchmarkResults) {
    const rawOverall = r.rawVariantA.fidelityScore?.overall ?? "-";
    const harOverall = r.harnessedVariantA.fidelityScore?.overall ?? "-";
    const deltaOverall =
      r.delta !== null
        ? (r.delta.overall > 0 ? `+${r.delta.overall}` : `${r.delta.overall}`)
        : "-";

    console.log(
      `  ${r.setId.padEnd(14)} ${r.category.padEnd(18)} ${String(rawOverall).padEnd(7)} ${String(harOverall).padEnd(11)} ${deltaOverall}`
    );

    if (r.delta) validDeltas.push(r.delta);
  }

  // ── Aggregate ──
  if (validDeltas.length > 0) {
    const avg = (key: keyof NonNullable<SetBenchmarkResult["delta"]>) =>
      Math.round(
        (validDeltas.reduce((sum, d) => sum + d![key], 0) /
          validDeltas.length) *
          10
      ) / 10;

    const avgDelta = {
      palette: avg("palette"),
      typography: avg("typography"),
      density: avg("density"),
      structure: avg("structure"),
      overall: avg("overall"),
    };

    const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

    console.log(
      "\n  ─────────────────────────────────────────────────────────────────"
    );
    console.log(
      `  AVERAGE (${validDeltas.length} sets)                                      ${sign(avgDelta.overall)}`
    );
    console.log();
    console.log("  Per-dimension averages:");
    console.log(
      `    Palette:    ${sign(avgDelta.palette)}`
    );
    console.log(
      `    Typography: ${sign(avgDelta.typography)}`
    );
    console.log(
      `    Density:    ${sign(avgDelta.density)}`
    );
    console.log(
      `    Structure:  ${sign(avgDelta.structure)}`
    );
    console.log(
      `    Overall:    ${sign(avgDelta.overall)}`
    );

    if (avgDelta.overall >= 3) {
      console.log(
        "\n  ✓ TARGET MET: Average harness delta >= 3.0 points"
      );
    } else if (avgDelta.overall > 0) {
      console.log(
        `\n  ⚡ Harness shows improvement but below 3.0 target (${sign(avgDelta.overall)})`
      );
    } else {
      console.log(
        `\n  ✗ Harness did not improve overall score (${sign(avgDelta.overall)})`
      );
    }
  }

  // ── Write benchmark output ──
  const benchmarkPath = path.join(
    outDir,
    `benchmark-${timestamp}.json`
  );

  const benchmarkOutput = {
    timestamp: new Date().toISOString(),
    phase: "full-benchmark",
    version: setsFile.version,
    config: {
      fidelityMode: "balanced",
      tokens: "neutral-benchmark",
      scorer: "gemini-flash-realtime",
    },
    summary: {
      setsRun: benchmarkResults.length,
      setsScored: validDeltas.length,
      averageDelta:
        validDeltas.length > 0
          ? {
              palette:
                Math.round(
                  (validDeltas.reduce((s, d) => s + d!.palette, 0) /
                    validDeltas.length) *
                    10
                ) / 10,
              typography:
                Math.round(
                  (validDeltas.reduce((s, d) => s + d!.typography, 0) /
                    validDeltas.length) *
                    10
                ) / 10,
              density:
                Math.round(
                  (validDeltas.reduce((s, d) => s + d!.density, 0) /
                    validDeltas.length) *
                    10
                ) / 10,
              structure:
                Math.round(
                  (validDeltas.reduce((s, d) => s + d!.structure, 0) /
                    validDeltas.length) *
                    10
                ) / 10,
              overall:
                Math.round(
                  (validDeltas.reduce((s, d) => s + d!.overall, 0) /
                    validDeltas.length) *
                    10
                ) / 10,
            }
          : null,
    },
    sets: benchmarkResults.map((r) => ({
      setId: r.setId,
      name: r.name,
      category: r.category,
      raw: {
        source: r.rawVariantA.source,
        score: r.rawVariantA.fidelityScore,
      },
      harnessed: {
        source: r.harnessedVariantA.source,
        score: r.harnessedVariantA.fidelityScore,
      },
      delta: r.delta,
    })),
  };

  fs.writeFileSync(benchmarkPath, JSON.stringify(benchmarkOutput, null, 2));
  console.log(
    `\n✓ Benchmark output: benchmark-results/benchmark-${timestamp}.json`
  );
  console.log("\n=== Benchmark complete ===");
}

runBenchmark().catch((err: unknown) => {
  console.error(
    "\n❌ Fatal:",
    err instanceof Error ? err.message : String(err)
  );
  process.exit(1);
});
