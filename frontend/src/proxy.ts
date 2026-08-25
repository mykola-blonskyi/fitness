import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import * as Sentry from '@sentry/nextjs';
import { devBypassIdentity, resolveIdentity } from '@libs/hub-identity';
import type { Identity } from '@shared/types/identity';
import { routing } from '@/i18n/routing';

const API_URL = process.env.API_URL!;
const AUTH_SECRET = process.env.AUTH_SECRET!;
const APP_URL = process.env.APP_URL!;
const BACKEND_URL = process.env.BACKEND_URL!;

const handleI18nRouting = createIntlMiddleware(routing);

function loginRedirect(req: NextRequest, locale: string) {
  const callbackUrl = `${APP_URL}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const loginUrl = `${API_URL}/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  return NextResponse.redirect(loginUrl);
}

async function hasCompletedProfile(identity: Identity): Promise<boolean> {
  const res = await fetch(`${BACKEND_URL}/users/me`, {
    headers: {
      'x-user-id': identity.userId,
      'x-user-email': identity.email,
    },
    cache: 'no-store',
  });
  return res.ok;
}

export async function proxy(req: NextRequest) {
  // Health checks stay public for infra monitoring (Coolify etc. have no
  // Hub session cookie to present).
  if (req.nextUrl.pathname.endsWith('/health')) {
    return NextResponse.next();
  }

  // Runs first so locale detection/redirect/cookie-persistence happens
  // before anything else. A redirect here (e.g. bare "/") short-circuits -
  // the browser re-requests with the resolved locale prefix and hits this
  // proxy again, so auth doesn't need to run against the pre-redirect URL.
  const intlResponse = handleI18nRouting(req);
  if (!intlResponse.ok) {
    return intlResponse;
  }
  // Safe because `intlResponse.ok` (not a redirect) only happens once the
  // path already carries a valid prefix - relies on localePrefix's default
  // 'always' mode (routing.ts); switching that would break this.
  const locale = req.nextUrl.pathname.split('/')[1];

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
      cookieName: 'authjs.session-token',
    });
    if (!token) {
      return loginRedirect(req, locale);
    }

    identity = await resolveIdentity(req.headers.get('cookie') ?? '');
    if (!identity) {
      return loginRedirect(req, locale);
    }
  }

  // Only the UUID, never email - ADR-006, this app handles real health
  // data and Sentry is a third-party service.
  Sentry.setUser({ id: identity.userId });

  // Profile completion is enforced here, before any other feature route
  // is reached (see the Auth spec's Implementation Decisions). /onboarding
  // itself is exempt, or a completed user could never reach it to submit
  // the form in the first place.
  const isOnboarding = req.nextUrl.pathname.split('/').includes('onboarding');
  if (!isOnboarding) {
    const complete = await hasCompletedProfile(identity);
    if (!complete) {
      return NextResponse.redirect(new URL(`/${locale}/onboarding`, req.url));
    }
  }

  // Headers set on intlResponse post-hoc would go to the client, not
  // upstream - request-header forwarding only works via one
  // NextResponse.next({request}) call, so it's rebuilt here, replicating
  // next-intl's own X-NEXT-INTL-LOCALE header (its documented contract
  // for a composed proxy - getRequestConfig reads this server-side).
  const headers = new Headers(req.headers);
  headers.set('x-user-id', identity.userId);
  headers.set('x-user-email', identity.email);
  headers.set('X-NEXT-INTL-LOCALE', locale);

  const response = NextResponse.next({ request: { headers } });
  for (const cookie of intlResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export const config = {
  // Excludes API routes, Next.js internals, and static files — routes
  // outside this matcher (e.g. future /api/* route handlers) must call
  // resolveIdentity() themselves rather than relying on this proxy.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
