/**
 * Proof gate 0.6 — the persistence ceiling, and uploads that no longer grow the canvas.
 *
 * Part A (limits). Build the two payloads from master plan 0.6:
 *   (a) a canvas whose artboard tree is 12 DesignNode levels deep
 *   (b) a canvas holding a ~1.5 MB data-URL reference
 * Offline: measure Convex value nesting depth (each object/array = one level, the
 * review's counting rule) and serialized size against the documented limits
 * (16 levels, 1 MiB). Live (when a dev deployment is configured): save each via
 * `projects:saveCanvasForAgent` and record the exact outcome.
 *
 * Part B (uploads). A 1.5 MB image uploaded through the new pipeline adds only a
 * URL + storage id + hash to the document; UnifiedCanvasView no longer inlines
 * data URLs; existing data-URL references are picked up by the lazy migration.
 *
 * Output: docs/proofs/convex-canvas-limits.json (committed).
 *
 * Live mode env: NEXT_PUBLIC_CONVEX_URL, CONVEX_INTERNAL_API_SECRET and
 * CONVEX_LIMITS_PROOF_PROJECT_ID (a throwaway project; its canvas is overwritten
 * and restored).
 *
 * Run: npm run proof:convex-canvas-limits
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { createEmptyCanvas, type ReferenceItem, type UnifiedCanvasState } from "../lib/canvas/unified-canvas-state";
import { applyCanvasDocumentWrite, prepareCanvasDocumentSave } from "../lib/canvas/canvas-document";
import type { DesignNode } from "../lib/canvas/design-node";
import { fitWithin, uploadPreparedImage } from "../lib/canvas/reference-upload";
import { referencesNeedingUpload, withAssetIdentity } from "../lib/canvas/use-data-url-asset-migration";

const CONVEX_LIMITS = { maxNestingDepth: 16, maxDocumentBytes: 1024 * 1024 };
const OUTPUT = "docs/proofs/convex-canvas-limits.json";

/** Convex-style value depth: every object or array is one level. */
export function valueDepth(value: unknown): number {
  if (Array.isArray(value)) return 1 + value.reduce<number>((max, entry) => Math.max(max, valueDepth(entry)), 0);
  if (value && typeof value === "object") {
    return 1 + Object.values(value as Record<string, unknown>).reduce<number>((max, entry) => Math.max(max, valueDepth(entry)), 0);
  }
  return 0;
}

function nestedTree(levels: number): DesignNode {
  const build = (level: number): DesignNode => ({
    id: `level-${level}`,
    type: level === levels ? "text" : "frame",
    name: `Level ${level}`,
    style: level === levels ? { fontSize: 14 } : { display: "flex", flexDirection: "column", gap: 8 },
    ...(level === levels ? { content: { text: `Depth ${level}` } } : { children: [build(level + 1)] }),
  });
  return build(1);
}

function deepCanvas(levels: number): UnifiedCanvasState {
  const tree = nestedTree(levels);
  const written = applyCanvasDocumentWrite(createEmptyCanvas(), [
    { type: "add_artboard", name: `Depth ${levels}`, breakpoint: "desktop", tree },
  ]);
  assert.equal(written.errors.length, 0, written.errors.join("; "));
  return written.state;
}

function dataUrlOfBytes(bytes: number): string {
  // base64 of `bytes` raw bytes — the size a phone photo inlines as today.
  return `data:image/jpeg;base64,${Buffer.alloc(bytes, 7).toString("base64")}`;
}

function referenceCanvas(imageUrl: string, extra: Partial<ReferenceItem> = {}): UnifiedCanvasState {
  const state = createEmptyCanvas();
  const reference = {
    id: "ref-proof",
    kind: "reference",
    x: 40,
    y: 40,
    width: 400,
    height: 300,
    rotation: 0,
    zIndex: 1,
    locked: false,
    imageUrl,
    source: "upload",
    title: "phone-photo.jpg",
    ...extra,
  } as ReferenceItem;
  return { ...state, items: [reference] };
}

type Measured = { depth: number; bytes: number; withinDepth: boolean; withinSize: boolean };

function measure(state: UnifiedCanvasState): Measured {
  const payload = prepareCanvasDocumentSave(state).state;
  const depth = valueDepth(payload);
  const bytes = Buffer.byteLength(JSON.stringify(payload));
  return {
    depth,
    bytes,
    withinDepth: depth <= CONVEX_LIMITS.maxNestingDepth,
    withinSize: bytes <= CONVEX_LIMITS.maxDocumentBytes,
  };
}

async function liveSave(state: UnifiedCanvasState): Promise<{ outcome: "saved" | "rejected"; detail: string } | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  const serviceSecret = process.env.CONVEX_INTERNAL_API_SECRET?.trim();
  const projectId = process.env.CONVEX_LIMITS_PROOF_PROJECT_ID?.trim();
  if (!url || url.includes("placeholder") || !serviceSecret || !projectId) return null;
  const client = new ConvexHttpClient(url);
  try {
    const result = await client.mutation(anyApi.projects.saveCanvasForAgent, {
      projectId,
      state: prepareCanvasDocumentSave(state).state,
      schemaVersion: prepareCanvasDocumentSave(state).schemaVersion,
      serviceSecret,
    });
    return { outcome: "saved", detail: `revision ${result.revision}` };
  } catch (error) {
    return { outcome: "rejected", detail: error instanceof Error ? error.message : String(error) };
  }
}

async function partA() {
  const deep = deepCanvas(12);
  const photo = referenceCanvas(dataUrlOfBytes(1_150_000)); // ~1.5 MB once base64-encoded
  const a = measure(deep);
  const b = measure(photo);
  assert.ok(b.bytes > 1_450_000 && b.bytes < 1_650_000, `payload (b) is ~1.5 MB (${b.bytes})`);

  // Where does the 16-level ceiling bite? Find the deepest tree that still fits.
  let maxFittingLevels = 0;
  for (let levels = 3; levels <= 20; levels++) {
    if (measure(deepCanvas(levels)).withinDepth) maxFittingLevels = levels;
  }

  const live = {
    a: await liveSave(deep),
    b: await liveSave(photo),
  };
  const liveRan = Boolean(live.a || live.b);
  if (liveRan) {
    // Leave the throwaway project with an empty canvas again.
    await liveSave(createEmptyCanvas());
  }

  console.log(`[proof] (a) 12-level tree: depth ${a.depth} (limit ${CONVEX_LIMITS.maxNestingDepth}) → ${a.withinDepth ? "fits" : "EXCEEDS"}`);
  console.log(`[proof] (b) 1.5 MB data URL: ${(b.bytes / 1024 / 1024).toFixed(2)} MiB (limit 1 MiB) → ${b.withinSize ? "fits" : "EXCEEDS"}`);
  console.log(`[proof]     deepest DesignNode tree that fits in one canvas document: ${maxFittingLevels} levels`);
  console.log(`[proof]     live save: ${liveRan ? JSON.stringify(live) : "not run (no dev deployment configured)"}`);
  return { a, b, maxFittingLevels, live, liveRan };
}

async function partB() {
  const before = measure(createEmptyCanvas());

  // A 1.5 MB photo through the upload pipeline (transport mocked): the document gains a URL, not bytes.
  const prepared = {
    blob: new Blob([Buffer.alloc(1_500_000, 7)], { type: "image/jpeg" }),
    contentType: "image/jpeg",
    width: 2048,
    height: 1536,
    contentHash: "a".repeat(64),
  };
  let uploadedBytes = 0;
  const asset = await uploadPreparedImage(prepared, {
    generateUploadUrl: async () => "https://proof.convex.cloud/api/storage/upload?token=proof",
    post: async (_url, blob) => {
      uploadedBytes = blob.size;
      return { storageId: "kg2proofstorageid" };
    },
    register: async (args) => ({
      url: `https://proof.convex.cloud/api/storage/${args.storageId}`,
      storageId: args.storageId,
      contentHash: args.contentHash,
    }),
  });
  assert.equal(uploadedBytes, 1_500_000, "bytes go to file storage");
  const withUpload = measure(
    referenceCanvas(asset.imageUrl, { storageId: asset.storageId, contentHash: asset.contentHash }),
  );
  const growth = withUpload.bytes - before.bytes;
  assert.ok(growth < 1024, `an uploaded reference adds ${growth} bytes to the canvas document (< 1 KB)`);
  assert.ok(!asset.imageUrl.startsWith("data:"));

  // Downscale target: a 12 MP phone photo becomes 2048 × 1536.
  assert.deepEqual(fitWithin(4032, 3024), { width: 2048, height: 1536, scaled: true });
  assert.deepEqual(fitWithin(1200, 800), { width: 1200, height: 800, scaled: false });

  // Lazy migration picks up inline references and rewrites them to stored assets.
  const legacy = referenceCanvas(dataUrlOfBytes(2_000));
  const pending = referencesNeedingUpload(legacy.items);
  assert.equal(pending.length, 1);
  const migrated = withAssetIdentity(pending[0]!, asset);
  assert.equal(migrated.storageId, "kg2proofstorageid");
  assert.equal(referencesNeedingUpload([migrated]).length, 0);

  const view = readFileSync("app/canvas-v1/components/UnifiedCanvasView.tsx", "utf8");
  assert.doesNotMatch(view, /fileToDataUrl/, "drop/paste no longer inline data URLs");
  assert.equal((view.match(/imageUploader\.upload\(/g) ?? []).length, 2, "drop and paste both upload");
  assert.match(view, /useDataUrlAssetMigration\(/);
  assert.match(readFileSync("app/canvas-v1/components/CanvasArtboard.tsx", "utf8"), /imageUploader[\s\S]*\.upload\(file\)/);
  assert.match(readFileSync("convex/assets.ts", "utf8"), /generateUploadUrl/);
  console.log(`[proof] uploads: a 1.5 MB image adds ${growth} bytes to the canvas document; data-URL references migrate lazily`);
  return { growthBytes: growth };
}

async function main() {
  const limits = await partA();
  const uploads = await partB();
  const report = {
    generatedAt: new Date().toISOString(),
    convexLimits: {
      ...CONVEX_LIMITS,
      source: "Convex data-type limits as cited in the 2026-09-22 architecture review; confirmed only by the live run.",
    },
    countingRule: "Every object or array in canvasDocuments.state counts as one nesting level.",
    payloads: {
      a_twelveLevelTree: limits.a,
      b_dataUrlReference: limits.b,
    },
    deepestFittingTreeLevels: limits.maxFittingLevels,
    live: limits.liveRan
      ? limits.live
      : {
          status: "not-run",
          reason:
            "No Convex dev deployment reachable from the proof environment. Set NEXT_PUBLIC_CONVEX_URL, CONVEX_INTERNAL_API_SECRET and CONVEX_LIMITS_PROOF_PROJECT_ID and re-run.",
        },
    verdict: {
      a: limits.a.withinDepth
        ? "fits"
        : limits.liveRan
          ? `exceeds the nesting limit (live: ${limits.live.a?.outcome}) → per plan 0.6, Phase 3 moves to the front`
          : "exceeds the documented nesting limit offline; the live run decides whether Phase 3 moves to the front",
      b: limits.b.withinSize
        ? "fits"
        : "exceeds the documented document size; new uploads now go to file storage (see uploads)",
    },
    uploads: {
      canvasBytesAddedPerUploadedReference: uploads.growthBytes,
      maxLongestSidePx: 2048,
      lazyMigration: "data-URL references upload on the next signed-in session",
    },
  };
  mkdirSync("docs/proofs", { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[proof] wrote ${OUTPUT}`);
  console.log("convex-canvas-limits proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
