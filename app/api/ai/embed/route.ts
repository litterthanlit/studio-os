import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding, buildEmbeddingText } from "@/lib/ai/embeddings";
import { createClient } from "@/lib/supabase/server";

type EmbedSingleBody = {
  referenceId: string;
  // Caller can pass metadata directly (avoids a DB round-trip for fresh references)
  text?: string;
  title?: string;
  tags?: string[];
  mood?: string;
  style?: string;
  contentType?: string;
  board?: string;
};

type EmbedBatchBody = {
  referenceIds: string[];
};

async function embedAndStore(
  referenceId: string,
  text: string
): Promise<{ referenceId: string; ok: boolean; reason?: string }> {
  const embedding = await generateEmbedding(text);
  if (embedding.length === 0) {
    return { referenceId, ok: false, reason: "embedding_empty" };
  }

  // Skip seed/local IDs — they don't exist in Supabase
  const isLocalId =
    referenceId.startsWith("local-") || referenceId.startsWith("ref-");
  if (isLocalId) {
    return { referenceId, ok: true, reason: "local_id_skipped" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("references")
      .update({ embedding: embedding as unknown as string })
      .eq("id", referenceId);

    if (error) throw error;
    return { referenceId, ok: true };
  } catch (err) {
    console.error("[embed] Supabase update failed:", err);
    return { referenceId, ok: false, reason: "supabase_error" };
  }
}

export async function POST(req: NextRequest) {
  let body: EmbedSingleBody | EmbedBatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Batch mode ──────────────────────────────────────────────────────────────
  if ("referenceIds" in body && Array.isArray(body.referenceIds)) {
    const { referenceIds } = body;
    if (referenceIds.length === 0) {
      return NextResponse.json({ results: [] });
    }
    if (referenceIds.length > 50) {
      return NextResponse.json(
        { error: "Batch limit is 50 references" },
        { status: 400 }
      );
    }

    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("references")
        .select("id, title, tags, mood, style, content_type, board_id")
        .in("id", referenceIds);

      if (error || !data) {
        return NextResponse.json(
          { error: "Failed to fetch references" },
          { status: 500 }
        );
      }

      const results = await Promise.all(
        data.map((row) => {
          const text = buildEmbeddingText({
            title: row.title,
            tags: row.tags,
            mood: row.mood,
            style: row.style,
            contentType: row.content_type,
            board: row.board_id,
          });
          return embedAndStore(row.id, text);
        })
      );

      return NextResponse.json({ results });
    } catch (err) {
      console.error("[embed] batch error:", err);
      return NextResponse.json(
        { error: "Batch embedding failed" },
        { status: 500 }
      );
    }
  }

  // ── Single mode ─────────────────────────────────────────────────────────────
  const single = body as EmbedSingleBody;
  if (!single.referenceId) {
    return NextResponse.json(
      { error: "referenceId is required" },
      { status: 400 }
    );
  }

  // Use caller-supplied text or build from individual fields
  const text =
    single.text ??
    buildEmbeddingText({
      title: single.title,
      tags: single.tags,
      mood: single.mood,
      style: single.style,
      contentType: single.contentType,
      board: single.board,
    });

  if (!text.trim()) {
    return NextResponse.json({ ok: false, reason: "empty_text" });
  }

  const result = await embedAndStore(single.referenceId, text);
  return NextResponse.json(result);
}
