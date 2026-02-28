// app/api/inspiration/admin/list/route.ts
// Admin endpoint to list scored images with filters

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/inspiration/admin/list
export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all";
  const minScore = Number(searchParams.get("minScore") || "0");
  const limit = Math.min(Number(searchParams.get("limit") || "100"), 200);

  try {
    let query = supabase
      .from("inspiration_images")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filter !== "all") {
      query = query.eq("curation_status", filter);
    }

    if (minScore > 0) {
      query = query.gte("score_overall", minScore);
    }

    const { data: images, error } = await query;

    if (error) {
      console.error("[admin/list] Database error:", error);
      return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
    }

    return NextResponse.json({
      images: images.map((img) => ({
        id: img.id,
        source: img.source,
        sourceId: img.source_id,
        imageUrl: img.image_url,
        thumbnailUrl: img.thumbnail_url,
        title: img.title,
        scoreComposition: img.score_composition,
        scoreColor: img.score_color,
        scoreMood: img.score_mood,
        scoreUniqueness: img.score_uniqueness,
        scoreOverall: img.score_overall,
        tags: img.tags,
        colors: img.colors,
        mood: img.mood,
        style: img.style,
        curationStatus: img.curation_status,
        displayCount: img.display_count,
        createdAt: img.created_at,
      })),
    });
  } catch (error) {
    console.error("[admin/list] Error:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}
