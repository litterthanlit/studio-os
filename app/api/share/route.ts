import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Share links now use authenticated Convex mutations." },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Share revocation now uses authenticated Convex mutations." },
    { status: 410 }
  );
}
