export const dynamic = "force-dynamic";
// app/api/inspiration/likes/route.ts
// Like/unlike functionality for inspiration images

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/inspiration/likes - Get user's liked images
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Return empty likes if not logged in
  if (!user) {
    return NextResponse.json({ likes: [] });
  }

  const { data: likes, error } = await supabase
    .from("inspiration_likes")
    .select("image_id, liked_at, feedback_tags")
    .eq("user_id", user.id)
    .order("liked_at", { ascending: false });

  if (error) {
    console.error("[inspiration/likes] Fetch error:", error);
    return NextResponse.json({ likes: [] });
  }

  return NextResponse.json({ likes });
}

// POST /api/inspiration/likes - Like an image
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Silently succeed if not logged in (demo mode)
  if (!user) {
    return NextResponse.json({ like: null, demo: true });
  }

  try {
    const body = await req.json();
    const { imageId, feedbackTags = [] } = body;

    if (!imageId) {
      return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
    }

    const { data: like, error } = await supabase
      .from("inspiration_likes")
      .insert({
        user_id: user.id,
        image_id: imageId,
        feedback_tags: feedbackTags,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation - already liked
        return NextResponse.json({ error: "Already liked" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ like });
  } catch (error) {
    console.error("[inspiration/likes] Like error:", error);
    return NextResponse.json({ error: "Failed to like image" }, { status: 500 });
  }
}

// DELETE /api/inspiration/likes - Unlike an image
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("imageId");

  if (!imageId) {
    return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
  }

  const { error } = await supabase
    .from("inspiration_likes")
    .delete()
    .eq("user_id", user.id)
    .eq("image_id", imageId);

  if (error) {
    console.error("[inspiration/likes] Unlike error:", error);
    return NextResponse.json({ error: "Failed to unlike image" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
