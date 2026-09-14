import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import * as Sentry from '@sentry/nextjs';
import { resolveIdentity } from '@libs/identity';
import { requireEnv } from '@libs/require-env';
import { PROXY_MATCHER } from '@libs/proxy-matcher';
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

export async function proxy(req: NextRequest) {
  // Health checks stay public for infra monitoring (Coolify etc. have no
  // session cookie to present).
  if (HEALTH_PATH.test(req.nextUrl.pathname)) {
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

  // The sign-in page itself must never be gated, or an unauthenticated
  // visit redirects to it forever.
  if (SIGN_IN_PATH.test(req.nextUrl.pathname)) {
    return intlResponse;
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
  const headers = new Headers(req.headers);
  headers.set('x-user-id', identity.sub);
  headers.set('x-user-email', identity.email);
  headers.set('X-NEXT-INTL-LOCALE', locale);

  const response = NextResponse.next({ request: { headers } });
  for (const cookie of intlResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export const config = {
  matcher: [PROXY_MATCHER],
};
