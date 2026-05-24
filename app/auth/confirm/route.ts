import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("error", "convex_auth_not_configured");
  return NextResponse.redirect(url);
}
