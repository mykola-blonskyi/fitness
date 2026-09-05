import type { JWT } from 'next-auth/jwt';

declare module 'next-auth/jwt' {
  interface JWT {
    identitySub?: string;
  }
}

// Split out from auth.ts so it stays testable without NextAuth()'s
// module-scope initialization. Reads the identity from `profile.sub`, not
// `user.id`: with no database adapter Auth.js discards the id returned by
// profile() and assigns a fresh random one on every sign-in (ADR-018).
// Kept off the standard `token.sub`, which Auth.js writes that random id
// into itself.
export function jwtCallback({
  token,
  profile,
  account,
}: {
  token: JWT;
  profile?: Record<string, unknown>;
  account?: { providerAccountId?: string } | null;
}): JWT {
  const sub = profile?.sub ?? account?.providerAccountId;
  if (typeof sub === 'string' && sub) {
    token.identitySub = sub;
  }
  return token;
}
