import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/vision";
  url.search = "?error=pinterest_convex_token_vault_required";
  const res = NextResponse.redirect(url);
  res.cookies.delete("pinterest_oauth_state");
  return res;
}
