export const dynamic = "force-dynamic";
// POST /api/inspiration/admin/score-pinterest
// Search Pinterest by query, score results with GPT-4 Vision, save to inspiration_images.
// Requires PINTEREST_PERSONAL_ACCESS_TOKEN env var (generate from developers.pinterest.com).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scoreImage } from "@/lib/ai/image-scorer";
import { searchPinsWithToken, pinImageUrl } from "@/lib/pinterest/client";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function scoreWithRetry(url: string, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await scoreImage(url);
    } catch (err) {
      if (i === retries) throw err;
      await delay(1000 * (i + 1));
    }
  }
  throw new Error("Max retries exceeded");
}

export async function POST(req: Request) {
  const token = process.env.PINTEREST_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "PINTEREST_PERSONAL_ACCESS_TOKEN not set. Generate one at developers.pinterest.com and add it to your Vercel env vars.",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const body = await req.json();
    const { query, limit = 5 } = body as { query: string; limit?: number };

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Cap at 5 to stay within Vercel's 60s function timeout (6s per image × 5 = 30s)
    const fetchLimit = Math.min(limit, 5);

    console.log(`[score-pinterest] Searching Pinterest for: "${query}" (limit: ${fetchLimit})`);
    const pins = await searchPinsWithToken(query.trim(), token, fetchLimit * 2);

    if (pins.length === 0) {
      return NextResponse.json({ message: "No image pins found for that query", scored: 0, total: 0 });
    }

    // Filter out already-scored Pinterest pins
    const { data: existing } = await supabase
      .from("inspiration_images")
      .select("source_id")
      .eq("source", "pinterest");

    const scoredIds = new Set(existing?.map((r) => r.source_id) || []);
    const unscoredPins = pins.filter((p) => !scoredIds.has(p.id)).slice(0, fetchLimit);

    if (unscoredPins.length === 0) {
      return NextResponse.json({
        message: "All found pins are already scored",
        scored: 0,
        total: pins.length,
      });
    }

    console.log(`[score-pinterest] Scoring ${unscoredPins.length} new pins...`);

    const results: Array<{ id: string; status: "success" | "error"; overall?: number; error?: string }> = [];

    for (let i = 0; i < unscoredPins.length; i++) {
      const pin = unscoredPins[i];
      const imageUrl = pinImageUrl(pin);
      if (!imageUrl) continue;

      try {
        console.log(`[score-pinterest] Scoring pin ${i + 1}/${unscoredPins.length}: ${pin.id}`);
        const analysis = await scoreWithRetry(imageUrl);

        const { error: dbErr } = await supabase.from("inspiration_images").insert({
          source: "pinterest",
          source_id: pin.id,
          image_url: imageUrl,
          thumbnail_url: imageUrl,
          title: pin.title || pin.description || query,
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

        if (dbErr) {
          results.push({ id: pin.id, status: "error", error: dbErr.message });
        } else {
          results.push({ id: pin.id, status: "success", overall: analysis.scores.overall });
        }
      } catch (err) {
        results.push({
          id: pin.id,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      if (i < unscoredPins.length - 1) {
        await delay(6000);
      }
    }

    const successful = results.filter((r) => r.status === "success").length;
    const approved = results.filter((r) => r.status === "success" && (r.overall ?? 0) >= 75).length;

    return NextResponse.json({
      query,
      total: unscoredPins.length,
      scored: successful,
      approved,
      errors: results.filter((r) => r.status === "error").map((r) => r.error),
    });
  } catch (err) {
    console.error("[score-pinterest] Error:", err);
    return NextResponse.json({ error: "Failed to score Pinterest results" }, { status: 500 });
  }
}
