import NextAuth from 'next-auth';
import { jwtCallback } from '@features/auth/lib/jwt-callback';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
} from '@libs/session-cookie';
import { requireEnv } from '@libs/require-env';

const OIDC_ISSUER = requireEnv('OIDC_ISSUER');
const OIDC_CLIENT_SECRET = requireEnv('OIDC_CLIENT_SECRET');

// No database adapter: NestJS owns the database (ADR-001).
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    {
      id: 'login',
      name: 'login.blonskyi.dev',
      type: 'oidc',
      issuer: OIDC_ISSUER,
      clientId: 'fitness',
      clientSecret: OIDC_CLIENT_SECRET,
      checks: ['pkce', 'state'],
      // Supplies email/name only; the identity comes from jwt-callback.ts.
      profile(profile) {
        return {
          id: profile.sub as string,
          email: profile.email as string,
          name: profile.name as string,
          image: profile.picture as string,
        };
      },
    },
  ],
  session: {
    strategy: 'jwt',
    // Matches login's own IdP session/refresh TTLs; true per-request
    // revocation would need its opt-in RFC 7662 introspection endpoint.
    maxAge: 60 * 60 * 24,
  },
  cookies: {
    sessionToken: {
      // Pinned, not left to Auth.js's `__Secure-` prefixing, whose
      // protocol detection is unreliable behind Coolify/Traefik. The
      // absent `domain` is deliberate: host-only, never cross-subdomain.
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: SESSION_COOKIE_SECURE,
      },
    },
  },
  callbacks: {
    jwt: jwtCallback,
  },
});
