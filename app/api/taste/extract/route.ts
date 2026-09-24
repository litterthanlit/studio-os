import { NextRequest, NextResponse } from "next/server";
import { extractTasteProfile, type TasteExtractBody } from "@/lib/taste/extract-core";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

/** POST /api/taste/extract — thin wrapper over lib/taste/extract-core. */
export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<TasteExtractBody>(req, {
    requireAuth: true,
    maxBytes: API_LIMITS.aiRequestBytes,
    rateLimit: { namespace: "taste-extract", limit: 30, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const result = await extractTasteProfile(guarded.body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.profile);
}
