import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { devBypassIdentity, resolveIdentity } from "@/shared/libs/hub-identity";

const API_URL = process.env.API_URL!;
const AUTH_SECRET = process.env.AUTH_SECRET!;
const APP_URL = process.env.APP_URL!;

export async function proxy(req: NextRequest) {
  // Health checks stay public for infra monitoring (Coolify etc. have no
  // Hub session cookie to present).
  if (req.nextUrl.pathname.endsWith("/health")) {
    return NextResponse.next();
  }

  // Local dev only — skips the Hub JWT check entirely, since the real
  // cookie can never be present on localhost. Hard-gated off in
  // production inside devBypassIdentity() itself.
  const bypass = devBypassIdentity();
  if (bypass) {
    const headers = new Headers(req.headers);
    headers.set("x-user-id", bypass.userId);
    headers.set("x-user-email", bypass.email);
    return NextResponse.next({ request: { headers } });
  }

  // Cookie name is pinned exactly as the Hub issues it — no `__Secure-`
  // prefix even in production. Do not "smart-detect" this per-environment.
  const token = await getToken({
    req,
    secret: AUTH_SECRET,
    cookieName: "authjs.session-token",
  });

  // TODO(FITNESS-11): once next-intl lands, read the locale from the
  // NEXT_LOCALE cookie / routing default instead of hardcoding "en".
  const locale = "en";
  const callbackUrl = `${APP_URL}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const loginUrl = `${API_URL}/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  const identity = await resolveIdentity(req.headers.get("cookie") ?? "");
  if (!identity) {
    return NextResponse.redirect(loginUrl);
  }

  const headers = new Headers(req.headers);
  headers.set("x-user-id", identity.userId);
  headers.set("x-user-email", identity.email);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Excludes API routes, Next.js internals, and static files — routes
  // outside this matcher (e.g. future /api/* route handlers) must call
  // resolveIdentity() themselves rather than relying on this proxy.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
