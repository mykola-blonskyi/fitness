import type { Identity } from '@shared/types/identity';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const API_URL = requireEnv('API_URL');

// Local dev only — the .blonskyi.dev cookie domain doesn't resolve on
// localhost and there's no way to reach a real deployed hub from here.
// Never honored in production, regardless of env content. Exported so
// proxy.ts can skip the Hub JWT check entirely in this mode, not just the
// validate-endpoint call.
export function devBypassIdentity(): Identity | null {
  if (process.env.NODE_ENV === 'production') return null;
  if (process.env.DEV_BYPASS_AUTH !== 'true') return null;

  const userId = process.env.DEV_USER_ID;
  const email = process.env.DEV_USER_EMAIL;
  if (!userId || !email) return null;

  return { userId, email };
}

// Calls the Hub's validate endpoint, forwarding the raw incoming Cookie
// header so the Hub can find its own session cookie inside it. Never
// throws — a Hub-unreachable or non-2xx response is treated the same as
// "no session" so callers can fall back to a login redirect, not a 500.
export async function resolveIdentity(
  cookieHeader: string,
): Promise<Identity | null> {
  const bypass = devBypassIdentity();
  if (bypass) return bypass;

  const PROJECT_SLUG = process.env.PROJECT_SLUG ?? 'fitness';

  try {
    const res = await fetch(
      `${API_URL}/api/auth/validate?project=${PROJECT_SLUG}`,
      { headers: { cookie: cookieHeader }, cache: 'no-store' },
    );
    if (!res.ok) return null;

    const body = (await res.json()) as {
      allowed: boolean;
      userId?: string;
      email?: string;
    };

    return body.allowed && body.userId && body.email
      ? { userId: body.userId, email: body.email }
      : null;
  } catch {
    return null;
  }
}
