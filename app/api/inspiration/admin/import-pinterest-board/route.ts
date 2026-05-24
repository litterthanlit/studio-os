import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Pinterest board imports now use admin-only Convex actions." },
    { status: 410 }
  );
}
