import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`; the behaviour is unchanged.
 *
 * This runs on every matched request, including prefetches, so it only looks at
 * whether a session cookie is *present* — no database call. That is deliberately
 * not a real authentication check: the token is verified against the database in
 * `lib/auth.ts`, which is what every page and route handler actually relies on.
 * The value here is redirecting early so a signed-out visitor never sees a
 * protected page flash before it decides they cannot have it.
 */
const SESSION_COOKIE = "aurelle_session";

/** Signed-in only. Browsing the shop stays open to everyone. */
const PROTECTED = ["/account", "/admin", "/settings"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && PROTECTED.some((route) => pathname.startsWith(route))) {
    const url = new URL("/login", request.nextUrl);
    // Bring them back where they were headed once they are in.
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  /*
   * Sending an already-signed-in visitor away from /login is deliberately NOT
   * done here. A cookie proves nothing — the session behind it may have expired,
   * been signed out elsewhere, or been revoked — and redirecting on the cookie
   * alone locks such a person out of the only page that could fix it: the header
   * offers them "Sign in", the proxy bounces them home, and nothing they click
   * does anything. The login page makes that call against the database instead.
   */
  return NextResponse.next();
}

export const config = {
  // Without a matcher this would also run for static files and image
  // optimisation, where a redirect would break the asset rather than protect it.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
