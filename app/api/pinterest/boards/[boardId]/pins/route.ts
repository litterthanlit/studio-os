import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Pinterest pins now use Convex actions and encrypted token storage." },
    { status: 410 }
  );
}
