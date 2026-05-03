import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { API_LIMITS, readGuardedJson, warnSafe } from "@/lib/security/api-guard";

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

    const guarded = await readGuardedJson<{ html?: unknown }>(req, {
      requireAuth: false,
      maxBytes: API_LIMITS.publishRequestBytes,
      rateLimit: { namespace: "export-publish", limit: 30, windowMs: 60 * 60 * 1000 },
    });
    if (!guarded.ok) return guarded.response;

    const html = typeof guarded.body.html === "string" ? guarded.body.html : "";
    if (html.length === 0) {
      return NextResponse.json({ error: "html is required" }, { status: 400 });
    }
    if (new TextEncoder().encode(html).length > API_LIMITS.publishRequestBytes) {
      return NextResponse.json(
        { error: `HTML exceeds ${API_LIMITS.publishRequestBytes} bytes` },
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
      warnSafe("[export/publish] insert failed", {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
    }

    const publishUrl = `${req.nextUrl.origin}/published/${id}`;
    return NextResponse.json({ id, publishUrl });
  } catch (e) {
    warnSafe("[export/publish] POST failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
