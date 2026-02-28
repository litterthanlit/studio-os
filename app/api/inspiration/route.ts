// app/api/inspiration/route.ts
// API routes for curated inspiration images

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { scoreImage } from "@/lib/ai/image-scorer";

function createAdminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/inspiration - Fetch curated images for the user
export async function GET(req: Request) {
  const supabase = createAdminSupabase();

  // For demo: use a fallback user ID if not logged in
  const userId = '00000000-0000-0000-0000-000000000001';

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "9"), 20);
  const minScore = Math.max(0, Math.min(Number(searchParams.get("minScore") ?? "75"), 100));

  try {
    // Call the database function to get curated images
    const { data: images, error } = await supabase.rpc("get_curated_inspiration", {
      p_user_id: userId,
      p_limit: limit,
      p_min_score: minScore,
    });

    if (error) {
      console.error("[inspiration] Database error:", error);
      return NextResponse.json({ error: "Failed to fetch inspiration" }, { status: 500 });
    }

    // If no curated images available, fallback to unscored Lummi images
    if (!images || images.length === 0) {
      return fetchFallbackImages(limit);
    }

    // Record what was shown to the user
    const imageIds = images.map((img: { id: string }) => img.id);
    await supabase.rpc("record_daily_inspiration", {
      p_user_id: userId,
      p_image_ids: imageIds,
      p_collection: "Curated",
    });

    return NextResponse.json({
      images: images.map(normalizeImage),
      collection: "Curated",
      scored: true,
    });
  } catch (error) {
    console.error("[inspiration] Error:", error);
    return fetchFallbackImages(limit);
  }
}

// POST /api/inspiration/score - Score a new image (admin/internal use)
export async function POST(req: Request) {
  const supabase = await createClient();

  // Verify admin or service role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { source, sourceId, imageUrl, thumbnailUrl, title } = body;

    if (!source || !sourceId || !imageUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if already scored
    const { data: existing } = await supabase
      .from("inspiration_images")
      .select("id")
      .eq("source", source)
      .eq("source_id", sourceId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Image already scored" }, { status: 409 });
    }

    // Score with GPT-4 Vision
    const analysis = await scoreImage(imageUrl);

    // Store in database
    const { data: image, error } = await supabase
      .from("inspiration_images")
      .insert({
        source,
        source_id: sourceId,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        title,
        score_composition: analysis.scores.composition,
        score_color: analysis.scores.color,
        score_mood: analysis.scores.mood,
        score_uniqueness: analysis.scores.uniqueness,
        score_overall: analysis.scores.overall,
        gpt_analysis: analysis,
        tags: analysis.tags,
        colors: analysis.colors,
        mood: analysis.mood,
        style: analysis.style,
        curation_status: analysis.scores.overall >= 75 ? "approved" : "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[inspiration] Insert error:", error);
      return NextResponse.json({ error: "Failed to store image" }, { status: 500 });
    }

    return NextResponse.json({
      image: normalizeImage(image),
      analysis,
    });
  } catch (error) {
    console.error("[inspiration] Scoring error:", error);
    return NextResponse.json(
      { error: "Failed to score image" },
      { status: 500 }
    );
  }
}

// Normalize database image to frontend format
function normalizeImage(img: Record<string, unknown>) {
  return {
    id: img.id,
    sourceId: img.source_id,
    imageUrl: img.image_url,
    thumbnailUrl: img.thumbnail_url,
    title: img.title,
    scores: {
      composition: img.score_composition,
      color: img.score_color,
      mood: img.score_mood,
      uniqueness: img.score_uniqueness,
      overall: img.score_overall,
    },
    tags: img.tags,
    colors: img.colors,
    mood: img.mood,
    style: img.style,
    displayCount: img.display_count,
  };
}

// Fallback to unscored Lummi images
async function fetchFallbackImages(limit: number) {
  try {
    const apiKey = process.env.LUMMI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ images: [], error: "No API key" }, { status: 200 });
    }

    const res = await fetch(
      `https://api.lummi.ai/v1/images/random?perPage=${limit}&orientation=portrait`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ images: [], error: "Lummi API error" }, { status: 200 });
    }

    const data = await res.json();
    const images = Array.isArray(data) ? data : data.images || [];

    return NextResponse.json({
      images: images.map((img: Record<string, unknown>) => ({
        id: img.id,
        sourceId: img.id,
        imageUrl: img.url || img.urls?.regular,
        thumbnailUrl: img.urls?.small || img.url,
        title: img.title || img.alt || "Untitled",
        scores: null,
        tags: [],
        colors: img.colors || [],
        mood: null,
        style: null,
      })),
      collection: "Random",
      scored: false,
    });
  } catch (error) {
    console.error("[inspiration] Fallback error:", error);
    return NextResponse.json({ images: [], error: "Failed to fetch" }, { status: 200 });
  }
}
