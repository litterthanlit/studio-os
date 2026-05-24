export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { API_LIMITS, readGuardedJson } from "@/lib/security/api-guard";

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
  const guarded = await readGuardedJson<{ query?: string; projectId?: string; limit?: number }>(req, {
    requireAuth: true,
    maxBytes: API_LIMITS.compositionRequestBytes,
    rateLimit: { namespace: "search", limit: 120, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const { query } = guarded.body;

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

  void embedding;
  const response: SearchResponse = {
    results: [],
    mode: "unavailable",
    query: query.trim(),
  };
  return NextResponse.json(response);
}
