import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Admin inspiration mutations now use admin-only Convex mutations." },
    { status: 410 }
  );
}
