import { NextRequest, NextResponse } from "next/server";
import { tagReference } from "@/lib/ai/tagger";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  let body: { referenceId?: string; imageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { referenceId, imageUrl } = body;
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  // Blob URLs can't be fetched server-side — skip tagging silently
  if (imageUrl.startsWith("blob:")) {
    return NextResponse.json({ skipped: true, reason: "blob url" });
  }

  const result = await tagReference(imageUrl);

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
      console.error("[ai/tag] Supabase update failed:", err);
      // Non-fatal — still return the tags to the client
    }
  }

  return NextResponse.json(result);
}
