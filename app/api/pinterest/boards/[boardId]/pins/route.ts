export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPins, pinImageUrl } from "@/lib/pinterest/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  const supabase = await createClient();

  try {
    const raw = await fetchPins(boardId, supabase);
    // Expose a simplified shape the client needs
    const pins = raw.map((p) => ({
      id: p.id,
      title: p.title ?? p.description ?? null,
      description: p.description ?? null,
      link: p.link ?? null,
      imageUrl: pinImageUrl(p),
      boardId: p.board_id,
    }));
    return NextResponse.json({ pins });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch pins";
    const status = message.includes("not connected") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
