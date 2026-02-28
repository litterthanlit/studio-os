export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const PINTEREST_OAUTH = "https://www.pinterest.com/oauth/";
const SCOPES = "boards:read,pins:read,user_accounts:read";

export async function GET(req: NextRequest) {
  const clientId = process.env.PINTEREST_CLIENT_ID;
  if (!clientId || clientId === "your_pinterest_client_id_here") {
    return NextResponse.json(
      { error: "Pinterest is not configured. Add PINTEREST_CLIENT_ID to .env.local." },
      { status: 500 }
    );
  }

  // CSRF state — random UUID stored in a short-lived cookie
  const state = crypto.randomUUID();
  const { origin } = new URL(req.url);
  const redirectUri = `${origin}/api/auth/pinterest/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
  });

  const response = NextResponse.redirect(`${PINTEREST_OAUTH}?${params}`);
  response.cookies.set("pinterest_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
