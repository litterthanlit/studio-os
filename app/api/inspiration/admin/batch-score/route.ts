import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Batch scoring now uses admin-only Convex actions." },
    { status: 410 }
  );
}
