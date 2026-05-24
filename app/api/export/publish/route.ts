import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Publishing now uses authenticated Convex mutations." },
    { status: 410 }
  );
}
