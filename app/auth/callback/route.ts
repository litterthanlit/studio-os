import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";

/**
 * Handles the PKCE callback from Supabase when a user clicks a magic link.
 * Supabase appends a `code` query param; we exchange it for a session.
 * New users (no onboarding_complete profile flag) are redirected to /onboarding.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if this user has completed onboarding
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_complete")
            .eq("id", user.id)
            .single();

          // New user or onboarding not complete → send to onboarding
          if (!profile || !profile.onboarding_complete) {
            return NextResponse.redirect(`${origin}/onboarding`);
          }
        }
      } catch {
        // Supabase not configured or table missing — fall through to default
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=auth_callback_failed`
  );
}
