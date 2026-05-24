export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding, buildEmbeddingText } from "@/lib/ai/embeddings";
import { API_LIMITS, readGuardedJson, warnSafe } from "@/lib/security/api-guard";

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

  // Skip seed/local IDs — they do not exist in backend storage.
  const isLocalId =
    referenceId.startsWith("local-") || referenceId.startsWith("ref-");
  if (isLocalId) {
    return { referenceId, ok: true, reason: "local_id_skipped" };
  }

  return { referenceId, ok: true, reason: "convex_embedding_store_pending" };
}

export async function POST(req: NextRequest) {
  const guarded = await readGuardedJson<EmbedSingleBody | EmbedBatchBody>(req, {
    requireAuth: true,
    maxBytes: API_LIMITS.tokenRequestBytes,
    rateLimit: { namespace: "ai-embed", limit: 120, windowMs: 60 * 60 * 1000 },
  });
  if (!guarded.ok) return guarded.response;

  const body = guarded.body;

  // ── Batch mode ──────────────────────────────────────────────────────────────
  if ("referenceIds" in body && Array.isArray(body.referenceIds)) {
    const referenceIds = body.referenceIds.filter((id) => typeof id === "string").slice(0, 50);
    if (referenceIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    try {
      return NextResponse.json({
        results: referenceIds.map((referenceId) => ({
          referenceId,
          ok: false,
          reason: "convex_batch_embedding_requires_authenticated_reference_query",
        })),
      });
    } catch (err) {
      warnSafe("[embed] batch error", {
        message: err instanceof Error ? err.message : String(err),
      });
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
