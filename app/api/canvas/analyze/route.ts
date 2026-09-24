import { NextRequest, NextResponse } from "next/server";
import { analyzeReferenceImages } from "@/lib/canvas/analyze-images-core";
import { API_LIMITS, logSafe, readGuardedJson } from "@/lib/security/api-guard";

/** POST /api/canvas/analyze — thin wrapper over lib/canvas/analyze-images-core. */
export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{ images?: string[] }>(req, {
    requireAuth: true,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "canvas-analyze", limit: 60, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  logSafe("[canvas/analyze] request", { imageCount: guarded.body.images?.length ?? 0, authBypass: guarded.devBypass });
  const result = await analyzeReferenceImages(guarded.body.images ?? []);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ analysis: result.analysis, ...(result.fallback ? { fallback: true } : {}) });
}
