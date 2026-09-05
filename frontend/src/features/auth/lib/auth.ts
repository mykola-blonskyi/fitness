import NextAuth from 'next-auth';
import { jwtCallback } from '@features/auth/lib/jwt-callback';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
} from '@features/auth/lib/session-cookie';

// No database adapter: NestJS owns the database (ADR-001), so there is no
// Auth.js-managed table for it to write to.
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    {
      id: 'login',
      name: 'login.blonskyi.dev',
      type: 'oidc',
      issuer: process.env.OIDC_ISSUER!,
      clientId: 'fitness',
      clientSecret: process.env.OIDC_CLIENT_SECRET!,
      checks: ['pkce', 'state'],
      // Maps the ID token's standard claims onto `user` for email/name,
      // but not for the identity itself — see jwt-callback.ts.
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
    // 24h, matching login's own IdP session and refresh-token TTLs. True
    // per-request revocation would need login's RFC 7662 introspection
    // endpoint (opt-in per client) - deferred, not enabled here.
    maxAge: 60 * 60 * 24,
  },
  cookies: {
    sessionToken: {
      // Pinned explicitly rather than left to Auth.js's automatic
      // `__Secure-` prefixing, whose protocol detection is unreliable
      // behind Coolify/Traefik. No `domain` — host-only, never shared
      // with any other *.blonskyi.dev app.
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
