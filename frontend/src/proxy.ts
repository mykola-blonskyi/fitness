import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { devBypassIdentity, resolveIdentity } from "@/shared/libs/hub-identity";
import type { Identity } from "@/shared/types/identity";

const API_URL = process.env.API_URL!;
const AUTH_SECRET = process.env.AUTH_SECRET!;
const APP_URL = process.env.APP_URL!;
const BACKEND_URL = process.env.BACKEND_URL!;

// TODO(FITNESS-11): once next-intl lands, read the locale from the
// NEXT_LOCALE cookie / routing default instead of hardcoding "en".
const LOCALE = "en";

function loginRedirect(req: NextRequest) {
  const callbackUrl = `${APP_URL}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const loginUrl = `${API_URL}/${LOCALE}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  return NextResponse.redirect(loginUrl);
}

async function hasCompletedProfile(identity: Identity): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/users/me`, {
    headers: {
      "x-user-id": identity.userId,
      "x-user-email": identity.email,
    },
    cache: "no-store",
  });
  return res.ok;
}

export async function proxy(req: NextRequest) {
  // Health checks stay public for infra monitoring (Coolify etc. have no
  // Hub session cookie to present).
  if (req.nextUrl.pathname.endsWith("/health")) {
    return NextResponse.next();
  }

  let identity: Identity | null;

  const bypass = devBypassIdentity();
  if (bypass) {
    // Local dev only — skips the Hub JWT check entirely, since the real
    // cookie can never be present on localhost. Hard-gated off in
    // production inside devBypassIdentity() itself.
    identity = bypass;
  } else {
    // Cookie name is pinned exactly as the Hub issues it — no
    // `__Secure-` prefix even in production. Do not "smart-detect" this
    // per-environment.
    const token = await getToken({
      req,
      secret: AUTH_SECRET,
      cookieName: "authjs.session-token",
    });
    if (!token) {
      return loginRedirect(req);
    }

    identity = await resolveIdentity(req.headers.get("cookie") ?? "");
    if (!identity) {
      return loginRedirect(req);
    }
  }

  const headers = new Headers(req.headers);
  headers.set("x-user-id", identity.userId);
  headers.set("x-user-email", identity.email);

  // Profile completion is enforced here, before any other feature route
  // is reached (see the Auth spec's Implementation Decisions). /onboarding
  // itself is exempt, or a completed user could never reach it to submit
  // the form in the first place.
  const isOnboarding = req.nextUrl.pathname
    .split("/")
    .includes("onboarding");
  if (!isOnboarding) {
    const complete = await hasCompletedProfile(identity);
    if (!complete) {
      return NextResponse.redirect(
        new URL(`/${LOCALE}/onboarding`, req.url),
      );
    }
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Excludes API routes, Next.js internals, and static files — routes
  // outside this matcher (e.g. future /api/* route handlers) must call
  // resolveIdentity() themselves rather than relying on this proxy.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
