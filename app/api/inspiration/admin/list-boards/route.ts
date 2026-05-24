import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Pinterest board listing now uses admin-only Convex actions." },
    { status: 410 }
  );
}
