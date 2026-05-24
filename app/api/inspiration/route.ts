import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Inspiration reads now use Convex queries." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Inspiration scoring now uses admin-only Convex actions." },
    { status: 410 }
  );
}
