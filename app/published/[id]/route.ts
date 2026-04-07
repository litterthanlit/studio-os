import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ID_RE = /^[a-zA-Z0-9_-]{8,24}$/;

/**
 * GET /published/:id — public static HTML (Track 10 Phase B).
 * No auth; RLS allows anon read of active rows.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!ID_RE.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return new NextResponse("Publish not configured", { status: 503 });
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from("published_exports")
    .select("html")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[published] select:", error);
    return new NextResponse("Not found", { status: 404 });
  }
  if (!data?.html) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(data.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
