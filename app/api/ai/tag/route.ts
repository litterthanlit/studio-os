export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { tagReference } from "@/lib/ai/tagger";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<{ referenceId?: string; imageUrl?: string; archetype?: string }>(req, {
    requireAuth: true,
    maxBytes: API_LIMITS.compositionRequestBytes,
    rateLimit: { namespace: "ai-tag", limit: 120, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const { referenceId, imageUrl, archetype } = guarded.body;
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }
  if (imageUrl.length > 4096) {
    return NextResponse.json({ error: "imageUrl is too long" }, { status: 413 });
  }

  // Blob URLs can't be fetched server-side — skip tagging silently
  if (imageUrl.startsWith("blob:")) {
    return NextResponse.json({ skipped: true, reason: "blob url" });
  }

  const result = await tagReference(imageUrl, archetype);

  void referenceId;

  return NextResponse.json(result);
}
