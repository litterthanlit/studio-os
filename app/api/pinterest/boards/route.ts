export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchBoards } from "@/lib/pinterest/client";

export async function GET() {
  const supabase = await createClient();
  try {
    const boards = await fetchBoards(supabase);
    return NextResponse.json({ boards });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch boards";
    const status = message.includes("not connected") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
