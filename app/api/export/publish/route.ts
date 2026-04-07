import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";

/** Max HTML size for one publish (2 MiB). */
const MAX_HTML_BYTES = 2 * 1024 * 1024;

/**
 * POST /api/export/publish
 * Body: { html: string }
 * Requires Supabase session. Stores HTML and returns a public /published/:id URL.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in required to publish a link." },
        { status: 401 }
      );
    }

    let body: { html?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const html = typeof body.html === "string" ? body.html : "";
    if (html.length === 0) {
      return NextResponse.json({ error: "html is required" }, { status: 400 });
    }
    if (html.length > MAX_HTML_BYTES) {
      return NextResponse.json(
        { error: `HTML exceeds ${MAX_HTML_BYTES} bytes` },
        { status: 413 }
      );
    }

    const id = nanoid(12);

    const { error } = await supabase.from("published_exports").insert({
      id,
      user_id: user.id,
      html,
    });

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "published_exports table missing. Run supabase/migrations/20260409120000_published_exports.sql",
          },
          { status: 503 }
        );
      }
      console.error("[export/publish] insert:", error);
      return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
    }

    const publishUrl = `${req.nextUrl.origin}/published/${id}`;
    return NextResponse.json({ id, publishUrl });
  } catch (e) {
    console.error("[export/publish] POST:", e);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
