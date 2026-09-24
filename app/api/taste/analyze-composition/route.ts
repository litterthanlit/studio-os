import { NextRequest, NextResponse } from "next/server";
import { analyzeCompositionImage } from "@/lib/taste/analyze-composition-core";
import { API_LIMITS, readGuardedJson, warnSafe } from "@/lib/security/api-guard";

/** POST /api/taste/analyze-composition — thin wrapper over lib/taste/analyze-composition-core. */
export async function POST(req: NextRequest) {
  try {
    const guarded = await readGuardedJson<{ imageUrl: string }>(req, {
      requireAuth: true,
      maxBytes: API_LIMITS.compositionRequestBytes,
      rateLimit: { namespace: "taste-composition", limit: 60, windowMs: 60 * 60 * 1000 },
    });
    if (!guarded.ok) return guarded.response;

    const result = await analyzeCompositionImage(guarded.body.imageUrl);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.analysis);
  } catch (err) {
    warnSafe("[taste/analyze-composition] Unexpected error", {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
