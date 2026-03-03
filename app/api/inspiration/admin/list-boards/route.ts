export const dynamic = "force-dynamic";
// GET /api/inspiration/admin/list-boards
// Returns all Pinterest boards for the personal access token owner.

import { NextResponse } from "next/server";
import { listBoardsWithToken } from "@/lib/pinterest/client";

export async function GET() {
  const token = process.env.PINTEREST_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "PINTEREST_PERSONAL_ACCESS_TOKEN not set" },
      { status: 500 }
    );
  }

  try {
    const boards = await listBoardsWithToken(token);
    return NextResponse.json({ boards });
  } catch (err) {
    console.error("[list-boards] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch boards" },
      { status: 500 }
    );
  }
}
