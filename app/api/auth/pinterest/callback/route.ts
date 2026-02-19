import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const storedState = req.cookies.get("pinterest_oauth_state")?.value;

  // Clear the CSRF cookie on any exit path
  function redirect(path: string) {
    const res = NextResponse.redirect(`${origin}${path}`);
    res.cookies.delete("pinterest_oauth_state");
    return res;
  }

  if (oauthError || !code || !state || state !== storedState) {
    console.error("[pinterest/callback] invalid state or oauth error:", oauthError);
    return redirect("/vision?error=pinterest_auth_failed");
  }

  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirect("/vision?error=pinterest_not_configured");
  }

  // Exchange authorization code for access + refresh tokens
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const redirectUri = `${origin}/api/auth/pinterest/callback`;

  let tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type: string;
  };

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("[pinterest/callback] token exchange failed:", text);
      return redirect("/vision?error=pinterest_token_failed");
    }

    tokenData = await tokenRes.json();
  } catch (err) {
    console.error("[pinterest/callback] token fetch error:", err);
    return redirect("/vision?error=pinterest_token_failed");
  }

  // Persist integration in Supabase (upsert so re-auth overwrites stale tokens)
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirect("/auth/login");

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase.from("integrations").upsert(
      {
        user_id: user.id,
        platform: "pinterest",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        expires_at: expiresAt,
        scope: tokenData.scope ?? "boards:read,pins:read",
      },
      { onConflict: "user_id, platform" }
    );

    if (upsertError) {
      console.error("[pinterest/callback] Supabase upsert error:", upsertError);
    }
  } catch (err) {
    console.error("[pinterest/callback] Supabase error:", err);
    // Non-fatal — still redirect to Vision so the UI doesn't break
  }

  return redirect("/vision?pinterest=connected");
}
