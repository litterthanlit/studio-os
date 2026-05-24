import { NextRequest, NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const url = request.nextUrl.clone();
  url.pathname = next;
  url.search = "";
  return NextResponse.redirect(url);
}
