// app/api/inspiration/admin/batch-score/route.ts
// Admin endpoint to batch score images from Lummi

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scoreImage } from "@/lib/ai/image-scorer";

// Sample images for testing (no API rate limits)
const SAMPLE_IMAGE_TEMPLATES = [
  { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80", title: "Modern interior" },
  { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80", title: "Minimal architecture" },
  { url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80", title: "Living space" },
  { url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&q=80", title: "Design detail" },
  { url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=80", title: "Furniture design" },
  { url: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=400&q=80", title: "Interior detail" },
  { url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&q=80", title: "Office space" },
  { url: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=400&q=80", title: "Bedroom design" },
];

function getSampleImages(limit: number) {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  console.log(`[batch-score] Generating sample images with timestamp: ${timestamp}, suffix: ${randomSuffix}`);
  return SAMPLE_IMAGE_TEMPLATES.slice(0, limit).map((img, i) => ({
    id: `sample-${timestamp}-${randomSuffix}-${i}`,
    ...img,
  }));
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// POST /api/inspiration/admin/batch-score
export async function POST(req: Request) {
  // Service role client — bypasses RLS for admin writes
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  console.log("[batch-score] Using service role client");

  try {
    const body = await req.json();
    const { source = "lummi", useLummi = false, limit = 6 } = body;

    let images: Array<{ id: string; url: string; thumbnailUrl?: string; title?: string }> = [];

    if (useLummi) {
      // Production: Fetch from Lummi with rate limiting
      const apiKey = process.env.LUMMI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "LUMMI_API_KEY not configured" }, { status: 500 });
      }

      // Limit to 10 images for rate limiting (10 req/min)
      const fetchLimit = Math.min(limit, 10);
      
      const params = new URLSearchParams({
        perPage: String(fetchLimit),
        orientation: "portrait",
      });

      const res = await fetch(`https://api.lummi.ai/v1/images/random?${params.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        // Fallback to sample images on rate limit
        console.log("[batch-score] Lummi rate limited, using sample images");
        images = getSampleImages(limit);
      } else {
        const data = await res.json();
        const lummiImages = Array.isArray(data) ? data : data.images || [];
        images = lummiImages.map((img: { id: string; url?: string; urls?: { regular?: string; small?: string }; title?: string; alt?: string }) => ({
          id: img.id,
          url: img.url || img.urls?.regular || "",
          thumbnailUrl: img.urls?.small,
          title: img.title || img.alt || "Untitled",
        }));
      }
    } else {
      // Testing: Use sample images with unique IDs each time
      images = getSampleImages(limit);
    }

    // Filter out already scored images
    console.log("[batch-score] Checking for existing scores...");
    const { data: existingScores, error: checkError } = await supabase
      .from("inspiration_images")
      .select("source_id")
      .eq("source", source);
    
    if (checkError) {
      console.error("[batch-score] Error checking existing scores:", checkError);
      return NextResponse.json({ error: "Database error", details: checkError.message }, { status: 500 });
    }

    const scoredIds = new Set(existingScores?.map((s) => s.source_id) || []);
    console.log("[batch-score] Already scored:", scoredIds.size);
    
    const unscoredImages = images.filter((img) => !scoredIds.has(img.id));
    console.log("[batch-score] Unscored images:", unscoredImages.length);

    if (unscoredImages.length === 0) {
      return NextResponse.json({ message: "No new images to score", scored: 0, total: images.length });
    }

    // Score images one by one with 6-second delay for rate limiting (10/min max)
    const results: Array<{
      id: string;
      status: "success" | "error";
      overall?: number;
      error?: string;
    }> = [];

    for (let i = 0; i < unscoredImages.length; i++) {
      const img = unscoredImages[i];
      try {
        console.log(`[batch-score] Scoring image ${i + 1}/${unscoredImages.length}: ${img.id}`);
        const analysis = await scoreImageWithRetry(img.url);

        const { error } = await supabase.from("inspiration_images").insert({
          source,
          source_id: img.id,
          image_url: img.url,
          thumbnail_url: img.thumbnailUrl || img.url,
          title: img.title || "Untitled",
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
        });

        if (error) {
          console.error(`[batch-score] DB insert error for ${img.id}:`, error.message, error.details, error.hint);
          results.push({ id: img.id, status: "error", error: `DB: ${error.message}` });
        } else {
          results.push({ id: img.id, status: "success", overall: analysis.scores.overall });
        }

        // 6-second delay between images for rate limiting (10 images/minute max)
        if (i < unscoredImages.length - 1) {
          console.log("[batch-score] Waiting 6s for rate limiting...");
          await delay(6000);
        }
      } catch (error) {
        results.push({
          id: img.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successful = results.filter((r) => r.status === "success").length;
    const approved = results.filter((r) => r.status === "success" && (r.overall || 0) >= 75).length;
    const errors = results.filter((r) => r.status === "error").map((r) => r.error);

    return NextResponse.json({
      total: unscoredImages.length,
      scored: successful,
      approved,
      errors: errors.length > 0 ? errors : undefined,
      results,
    });
  } catch (error) {
    console.error("[batch-score] Error:", error);
    return NextResponse.json(
      { error: "Batch scoring failed" },
      { status: 500 }
    );
  }
}

// Retry wrapper for individual image scoring
async function scoreImageWithRetry(url: string, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await scoreImage(url);
    } catch (error) {
      if (i === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}
