// app/api/inspiration/admin/update-status/route.ts
// Admin endpoint to update image curation status

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/inspiration/admin/update-status
export async function POST(req: Request) {
  const supabase = await createClient();

  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { imageId, status } = body;

    if (!imageId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("inspiration_images")
      .update({
        curation_status: status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", imageId)
      .select()
      .single();

    if (error) {
      console.error("[admin/update-status] Database error:", error);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, image: data });
  } catch (error) {
    console.error("[admin/update-status] Error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
