import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexQuery } from "@/lib/convex/server";

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

  const data = await convexQuery<{ html: string }>(api.publicContent.getPublishedExport, {
    publicId: id,
  });

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return new NextResponse("Publish not configured", { status: 503 });
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
