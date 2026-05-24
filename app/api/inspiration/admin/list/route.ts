import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Admin inspiration listing now uses admin-only Convex queries." },
    { status: 410 }
  );
}
