import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Pinterest access now uses Convex actions and encrypted token storage." },
    { status: 410 }
  );
}
