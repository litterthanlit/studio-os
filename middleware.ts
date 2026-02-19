import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Paths that don't require authentication
const PUBLIC_PREFIXES = ["/auth", "/onboarding", "/share"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If Supabase isn't configured yet, let everything through
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes("your-project-ref")
  ) {
    return NextResponse.next({ request });
  }

  // Build Supabase client that reads/writes cookies from the request/response
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() verifies the JWT server-side — do not replace with getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public paths: let through, but bounce authenticated users away from login
  if (isPublic(pathname)) {
    if (user && pathname.startsWith("/auth/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Protected paths: redirect to login if not signed in
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
