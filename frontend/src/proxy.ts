import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import * as Sentry from '@sentry/nextjs';
import { resolveIdentity } from '@libs/identity';
import { requireEnv } from '@libs/require-env';
import type { Identity } from '@shared/types/identity';
import { routing } from '@/i18n/routing';

const APP_URL = requireEnv('APP_URL');
const BACKEND_URL = requireEnv('BACKEND_URL');

const HEALTH_PATH = new RegExp(`^/(${routing.locales.join('|')})/health$`);
const SIGN_IN_PATH = new RegExp(`^/(${routing.locales.join('|')})/login$`);

const handleI18nRouting = createIntlMiddleware(routing);

function signInRedirect(req: NextRequest, locale: string) {
  const signInUrl = new URL(`/${locale}/login`, APP_URL);
  signInUrl.searchParams.set(
    'callbackUrl',
    `${APP_URL}${req.nextUrl.pathname}${req.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
}

// Never throws - a backend-unreachable or non-2xx response is treated as
// "not completed" so the caller falls back to the onboarding redirect,
// not a 500.
async function hasCompletedProfile(identity: Identity): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/users/me`, {
      headers: {
        'x-user-id': identity.sub,
        'x-user-email': identity.email,
      },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// api-client.ts reads x-user-id/x-user-email back off the request and
// cannot tell a value this proxy set from one the client sent, so they are
// dropped on every path before anything is forwarded upstream.
function forward(req: NextRequest, extra?: Record<string, string>) {
  const headers = new Headers(req.headers);
  headers.delete('x-user-id');
  headers.delete('x-user-email');
  for (const [key, value] of Object.entries(extra ?? {})) {
    headers.set(key, value);
  }
  return NextResponse.next({ request: { headers } });
}

export async function proxy(req: NextRequest) {
  // Health checks stay public for infra monitoring (Coolify etc. have no
  // session cookie to present).
  if (HEALTH_PATH.test(req.nextUrl.pathname)) {
    return forward(req);
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

  // The sign-in page itself must never be gated, or an unauthenticated
  // visit redirects to it forever.
  if (SIGN_IN_PATH.test(req.nextUrl.pathname)) {
    const response = forward(req);
    for (const cookie of intlResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    return response;
  }

  const identity = await resolveIdentity(req);
  if (!identity) {
    return signInRedirect(req, locale);
  }

  // Only the UUID, never email - ADR-006, this app handles real health
  // data and Sentry is a third-party service.
  Sentry.setUser({ id: identity.sub });

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
  const response = forward(req, {
    'x-user-id': identity.sub,
    'x-user-email': identity.email,
    'X-NEXT-INTL-LOCALE': locale,
  });
  for (const cookie of intlResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export const config = {
  // Every exclusion is anchored to the first path segment. A bare `.*\..*`
  // also excludes app routes whose dynamic segment holds a dot
  // (`/en/workouts/a.b`), and an unproxied route forwards the client's own
  // x-user-id to NestJS, which trusts it unconditionally.
  // Next requires these to be static string literals, so proxy-matcher.test.ts
  // reads this file rather than importing the value.
  matcher: [
    '/((?!api/|_next/|_vercel/|favicon\\.ico$|sw\\.js$|manifest\\.webmanifest$|apple-touch-icon\\.png$|icons/|[^/]+\\.svg$).*)',
  ],
};
