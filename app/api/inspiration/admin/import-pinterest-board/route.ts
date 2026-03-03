export const dynamic = "force-dynamic";
// POST /api/inspiration/admin/import-pinterest-board
// Fetch pins from a specific Pinterest board, score with GPT-4 Vision,
// save to inspiration_images. Uses PINTEREST_PERSONAL_ACCESS_TOKEN.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scoreImage } from "@/lib/ai/image-scorer";
import { fetchBoardPinsWithToken, pinImageUrl } from "@/lib/pinterest/client";

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
      { error: "PINTEREST_PERSONAL_ACCESS_TOKEN not set" },
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
    const { boardId, boardName, limit = 5 } = body as {
      boardId: string;
      boardName?: string;
      limit?: number;
    };

    if (!boardId?.trim()) {
      return NextResponse.json({ error: "boardId is required" }, { status: 400 });
    }

    // Cap at 5 to stay within Vercel's 60s timeout
    const fetchLimit = Math.min(limit, 5);

    console.log(`[import-board] Fetching pins from board: ${boardId}`);
    const pins = await fetchBoardPinsWithToken(boardId, token, fetchLimit * 3);

    if (pins.length === 0) {
      return NextResponse.json({
        message: "No image pins found in that board",
        scored: 0,
        total: 0,
      });
    }

    // Filter already-scored pins from this board
    const { data: existing } = await supabase
      .from("inspiration_images")
      .select("source_id")
      .eq("source", "pinterest");

    const scoredIds = new Set(existing?.map((r) => r.source_id) || []);
    const unscoredPins = pins.filter((p) => !scoredIds.has(p.id)).slice(0, fetchLimit);

    if (unscoredPins.length === 0) {
      return NextResponse.json({
        message: "All pins in this board are already scored",
        scored: 0,
        total: pins.length,
      });
    }

    console.log(`[import-board] Scoring ${unscoredPins.length} new pins...`);

    const results: Array<{
      id: string;
      status: "success" | "error";
      overall?: number;
      error?: string;
    }> = [];

    for (let i = 0; i < unscoredPins.length; i++) {
      const pin = unscoredPins[i];
      const imageUrl = pinImageUrl(pin);
      if (!imageUrl) continue;

      try {
        console.log(`[import-board] Scoring pin ${i + 1}/${unscoredPins.length}: ${pin.id}`);
        const analysis = await scoreWithRetry(imageUrl);

        const { error: dbErr } = await supabase.from("inspiration_images").insert({
          source: "pinterest",
          source_id: pin.id,
          image_url: imageUrl,
          thumbnail_url: imageUrl,
          title: pin.title || pin.description || boardName || "Pinterest",
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
      boardId,
      boardName,
      total: unscoredPins.length,
      scored: successful,
      approved,
      errors: results.filter((r) => r.status === "error").map((r) => r.error),
    });
  } catch (err) {
    console.error("[import-board] Error:", err);
    return NextResponse.json(
      { error: "Failed to import Pinterest board" },
      { status: 500 }
    );
  }
}
