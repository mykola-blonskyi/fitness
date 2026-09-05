import { describe, expect, it } from 'vitest';
import type { JWT } from 'next-auth/jwt';
import { jwtCallback } from '@features/auth/lib/jwt-callback';

// Guards ADR-018's one silent-corruption risk: without a database adapter
// Auth.js hands `user.id`/`token.sub` a fresh random value per sign-in, so
// the identity must come from the provider's own claims.
describe('jwtCallback', () => {
  it('takes the identity from profile.sub', () => {
    const token = jwtCallback({
      token: {} as JWT,
      profile: { sub: 'real-sub' },
    });

    expect(token.identitySub).toBe('real-sub');
  });

  it('falls back to account.providerAccountId when profile has no sub', () => {
    const token = jwtCallback({
      token: {} as JWT,
      profile: {},
      account: { providerAccountId: 'real-sub' },
    });

    expect(token.identitySub).toBe('real-sub');
  });

  it('never takes the identity from the random id on token.sub', () => {
    const token = jwtCallback({
      token: { sub: 'random-per-signin' } as JWT,
      profile: { sub: 'real-sub' },
    });

    expect(token.identitySub).toBe('real-sub');
    expect(token.identitySub).not.toBe(token.sub);
  });

  it('keeps the existing identity on later calls, which carry no profile', () => {
    const token = jwtCallback({
      token: { identitySub: 'real-sub' } as JWT,
    });

    expect(token.identitySub).toBe('real-sub');
  });

  it('does not overwrite the identity with a non-string or empty sub', () => {
    const token = jwtCallback({
      token: { identitySub: 'real-sub' } as JWT,
      profile: { sub: '' },
      account: { providerAccountId: undefined },
    });

    expect(token.identitySub).toBe('real-sub');
  });
});
