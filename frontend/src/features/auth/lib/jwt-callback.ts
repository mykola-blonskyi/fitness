import type { JWT } from 'next-auth/jwt';

declare module 'next-auth/jwt' {
  interface JWT {
    identitySub?: string;
  }
}

// Never read the identity from `user.id`: with no database adapter Auth.js
// discards profile()'s id and substitutes a fresh random one per sign-in,
// which it also writes into the standard `token.sub` (ADR-018).
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
