#!/usr/bin/env tsx
/**
 * scripts/generate-marketing-images.ts
 *
 * Downloads high-quality marketing images from Lummi AI and converts them to
 * optimised WebP for use in the Studio OS marketing site.
 *
 * Usage:
 *   npx tsx scripts/generate-marketing-images.ts
 *   # or via npm script:
 *   npm run generate:marketing-images
 *
 * Requirements:
 *   LUMMI_API_KEY must be set in .env.local (or your shell environment).
 *
 * Output:
 *   public/marketing/<slot>.webp   — full resolution (1920×1080 or native)
 *   public/marketing/<slot>@2x.webp — 2× srcset variant (same as above)
 *   public/marketing/<slot>-thumb.webp — 800-wide preview for LCP
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

// ── Lazy-load sharp so the script works even if the user doesn't have it
// as a top-level dep (it comes in via Next.js)
async function getSharp() {
  try {
    const sharp = (await import("sharp")).default;
    return sharp;
  } catch {
    console.error(
      "❌  sharp not found. Run: npm install sharp\n" +
        "   (it ships with Next.js but may not be in your PATH)"
    );
    process.exit(1);
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

const LUMMI_API = "https://api.lummi.ai/v1";
const OUTPUT_DIR = path.join(process.cwd(), "public", "marketing");

/** Marketing image slots and their Lummi search prompts */
const SLOTS = [
  {
    name: "hero",
    query:
      "minimal design workspace dark UI creative tools sophisticated moody lighting premium setup",
    orientation: "landscape",
    width: 1920,
    height: 1080,
  },
  {
    name: "features",
    query:
      "creative moodboard references design inspiration collage editorial aesthetic visual research",
    orientation: "landscape",
    width: 1920,
    height: 1080,
  },
  {
    name: "showcase",
    query:
      "design system tokens colorful UI components dark theme premium software interface clean",
    orientation: "landscape",
    width: 1920,
    height: 1080,
  },
  {
    name: "cta",
    query:
      "designer workspace aerial view clean desk modern studio natural light minimal productive",
    orientation: "landscape",
    width: 1920,
    height: 1080,
  },
] as const;

// ── Lummi API types ───────────────────────────────────────────────────────────

interface LummiImage {
  id: string;
  url?: string;
  urls?: { full?: string; regular?: string; small?: string };
  title?: string;
  width?: number;
  height?: number;
}

interface LummiResponse {
  images?: LummiImage[];
  data?: LummiImage[];
  results?: LummiImage[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadEnv() {
  // Try loading .env.local manually (tsx doesn't load dotenv automatically)
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto
      .get(url, { headers: { "User-Agent": "studio-os-marketing-script/1.0" } }, (res) => {
        // Follow redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return resolve(downloadBuffer(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function searchLummi(
  query: string,
  orientation: string,
  apiKey: string,
  limit = 5
): Promise<LummiImage[]> {
  const params = new URLSearchParams({
    query,
    perPage: String(limit),
    page: "1",
  });
  if (orientation) params.set("orientation", orientation);

  const url = `${LUMMI_API}/images/search?${params}`;
  console.log(`  🔍  Searching: "${query.slice(0, 60)}…"`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`Lummi search failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as LummiResponse;
  const images = data.images ?? data.data ?? data.results ?? [];
  console.log(`  ✅  Found ${images.length} result(s)`);
  return images;
}

function pickBestUrl(img: LummiImage): string | null {
  return (
    img.urls?.full ??
    img.urls?.regular ??
    img.url ??
    null
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  const apiKey = process.env.LUMMI_API_KEY;
  if (!apiKey) {
    console.error(
      "❌  LUMMI_API_KEY is not set.\n" +
        "   Add it to .env.local or export it in your shell."
    );
    process.exit(1);
  }

  const sharp = await getSharp();

  // Ensure output dir exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\n🎨  Studio OS — Marketing Image Generator`);
  console.log(`   Output: ${OUTPUT_DIR}\n`);

  const manifest: Record<string, { webp: string; thumb: string; alt: string; lummiId: string }> =
    {};

  for (const slot of SLOTS) {
    console.log(`\n── ${slot.name.toUpperCase()} ──────────────────────────────`);

    let images: LummiImage[] = [];
    try {
      images = await searchLummi(slot.query, slot.orientation, apiKey, 5);
    } catch (err) {
      console.warn(`  ⚠️  Search failed: ${(err as Error).message}`);
      continue;
    }

    if (images.length === 0) {
      console.warn("  ⚠️  No results returned, skipping.");
      continue;
    }

    // Pick the first image with a usable URL
    let chosen: LummiImage | null = null;
    let srcUrl: string | null = null;
    for (const img of images) {
      srcUrl = pickBestUrl(img);
      if (srcUrl) {
        chosen = img;
        break;
      }
    }

    if (!chosen || !srcUrl) {
      console.warn("  ⚠️  No downloadable URL found, skipping.");
      continue;
    }

    console.log(`  📥  Downloading: ${srcUrl.slice(0, 80)}…`);

    let raw: Buffer;
    try {
      raw = await downloadBuffer(srcUrl);
    } catch (err) {
      console.warn(`  ⚠️  Download failed: ${(err as Error).message}`);
      continue;
    }

    // ── Full-res WebP (1920×1080, cover-cropped) ──
    const fullPath = path.join(OUTPUT_DIR, `${slot.name}.webp`);
    await sharp(raw)
      .resize(slot.width, slot.height, { fit: "cover", position: "attention" })
      .webp({ quality: 85, effort: 4 })
      .toFile(fullPath);

    const fullSize = fs.statSync(fullPath).size;
    console.log(
      `  💾  ${slot.name}.webp — ${(fullSize / 1024).toFixed(0)} KB`
    );

    // ── Thumbnail WebP (800×450, for LCP preload / low-bandwidth) ──
    const thumbPath = path.join(OUTPUT_DIR, `${slot.name}-thumb.webp`);
    await sharp(raw)
      .resize(800, 450, { fit: "cover", position: "attention" })
      .webp({ quality: 75, effort: 4 })
      .toFile(thumbPath);

    const thumbSize = fs.statSync(thumbPath).size;
    console.log(
      `  💾  ${slot.name}-thumb.webp — ${(thumbSize / 1024).toFixed(0)} KB`
    );

    manifest[slot.name] = {
      webp: `/marketing/${slot.name}.webp`,
      thumb: `/marketing/${slot.name}-thumb.webp`,
      alt: chosen.title ?? slot.query.slice(0, 60),
      lummiId: chosen.id,
    };
  }

  // ── Write manifest ──
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📋  Manifest written: ${manifestPath}`);

  // ── Summary ──
  const generated = Object.keys(manifest).length;
  console.log(
    `\n✨  Done! Generated ${generated}/${SLOTS.length} images.\n` +
      `   Import the manifest in your components:\n` +
      `   import manifest from "@/public/marketing/manifest.json";\n`
  );
}

main().catch((err) => {
  console.error("\n❌  Fatal error:", err);
  process.exit(1);
});
