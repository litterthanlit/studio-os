import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Inspiration likes now use authenticated Convex functions." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Inspiration likes now use authenticated Convex functions." },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Inspiration likes now use authenticated Convex functions." },
    { status: 410 }
  );
}
