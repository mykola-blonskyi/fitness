import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
} from '@features/auth/lib/session-cookie';
import type { Identity } from '@shared/types/identity';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const AUTH_SECRET = requireEnv('AUTH_SECRET');

// A valid session already implies authorization: login only issues a
// token after its own approval-status and `fitness` client-membership
// checks, so there is no separate allow/deny call the way the Hub's
// /api/auth/validate used to be (ADR-018).
export async function resolveIdentity(
  request: NextRequest,
): Promise<Identity | null> {
  const token = await getToken({
    req: request,
    secret: AUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
    secureCookie: SESSION_COOKIE_SECURE,
  });

  if (!token?.identitySub || !token.email) {
    return null;
  }

  return { sub: token.identitySub, email: token.email };
}
