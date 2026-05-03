export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { tagReference } from "@/lib/ai/tagger";
import { createClient } from "@/lib/supabase/server";
import { API_LIMITS, readGuardedJson, warnSafe } from "@/lib/security/api-guard";

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

  // Persist to Supabase if we have a real DB reference ID
  if (referenceId && !referenceId.startsWith("local-") && !referenceId.startsWith("ref-")) {
    try {
      const supabase = await createClient();
      await supabase
        .from("references")
        .update({
          tags: result.tags,
          tag_tiers: result.tagTiers,
          colors: result.colors,
          mood: result.mood,
          style: result.style,
          content_type: result.contentType,
          era: result.era || null,
          composition: result.composition || null,
          typography: result.typography || null,
        })
        .eq("id", referenceId);
    } catch (err) {
      warnSafe("[ai/tag] Supabase update failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      // Non-fatal — still return the tags to the client
    }
  }

  return NextResponse.json(result);
}
