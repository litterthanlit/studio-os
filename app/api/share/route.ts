import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export type ShareSnapshot = {
  id: string;
  imageUrl: string;
  board: string;
  notes?: string;
  tags: {
    style: string[];
    colors: string[];
    contentType: string[];
    mood: string[];
    ai: string[];
  };
  curationStatus?: string | null;
};

/** POST /api/share — create a new share link */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { references, projectName } = body as {
      references: ShareSnapshot[];
      projectName?: string;
    };

    if (!references || !Array.isArray(references)) {
      return NextResponse.json(
        { error: "references array is required" },
        { status: 400 }
      );
    }

    const shareId = nanoid(10);

    const { data, error } = await supabase
      .from("shares")
      .insert({
        share_id: shareId,
        user_id: user.id,
        project_name: projectName ?? "Studio Moodboard",
        snapshot: references,
        is_active: true,
      })
      .select("share_id")
      .single();

    if (error) {
      // If table doesn't exist yet, return a helpful message
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "shares table not found. Run the migration in supabase/migrations/shares.sql",
          },
          { status: 503 }
        );
      }
      throw error;
    }

    const shareUrl = `${req.nextUrl.origin}/share/${data.share_id}`;
    return NextResponse.json({ shareId: data.share_id, shareUrl });
  } catch (e) {
    console.error("[share] POST error:", e);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

/** DELETE /api/share?shareId=xxx — revoke a share link */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shareId = req.nextUrl.searchParams.get("shareId");
    if (!shareId) {
      return NextResponse.json(
        { error: "shareId query param required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("shares")
      .update({ is_active: false })
      .eq("share_id", shareId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[share] DELETE error:", e);
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    );
  }
}
