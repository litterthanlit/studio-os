import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  board: string | null;
  tags: string[];
  mood: string | null;
  style: string | null;
  contentType: string | null;
  similarity: number;
};

export type SearchResponse = {
  results: SearchResult[];
  mode: "semantic" | "unavailable";
  query: string;
};

export async function POST(req: NextRequest) {
  let body: { query?: string; projectId?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query, projectId, limit = 12 } = body;

  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const embedding = await generateEmbedding(query.trim());

  if (embedding.length === 0) {
    // OpenAI not configured — return unavailable so UI can show a hint
    const response: SearchResponse = {
      results: [],
      mode: "unavailable",
      query: query.trim(),
    };
    return NextResponse.json(response);
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("match_references", {
      query_embedding: embedding,
      match_threshold: 0.45,
      match_count: Math.min(limit, 20),
      filter_project_id: projectId ?? null,
    });

    if (error) {
      console.error("[search] RPC error:", error);
      return NextResponse.json(
        { error: "Search failed", details: error.message },
        { status: 500 }
      );
    }

    const results: SearchResult[] = (data ?? []).map(
      (row: {
        id: string;
        image_url: string;
        thumbnail_url: string | null;
        title: string | null;
        board_id: string | null;
        tags: string[];
        mood: string | null;
        style: string | null;
        content_type: string | null;
        similarity: number;
      }) => ({
        id: row.id,
        imageUrl: row.image_url,
        thumbnailUrl: row.thumbnail_url,
        title: row.title,
        board: row.board_id,
        tags: row.tags ?? [],
        mood: row.mood,
        style: row.style,
        contentType: row.content_type,
        similarity: row.similarity,
      })
    );

    const response: SearchResponse = {
      results,
      mode: "semantic",
      query: query.trim(),
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[search] unexpected error:", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
