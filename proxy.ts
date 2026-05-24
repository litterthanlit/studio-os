import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/auth", "/onboarding", "/share", "/published"];
const PUBLIC_EXACT = ["/", "/privacy", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/icon.svg"];

function isPublic(pathname: string): boolean {
  return PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isApi(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname) || isApi(pathname)) return NextResponse.next({ request });

  // Real access control is enforced in Convex functions. Until a Convex auth
  // provider is configured, production middleware must not pretend to validate
  // user identity from client-controlled data.
  if (process.env.NODE_ENV === "production" && process.env.STUDIO_OS_REQUIRE_AUTH === "true") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
