import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchProfileStatus } from '@shared/libs/profile-status';

const identity = { sub: 'user-1', email: 'user@example.com' };

afterEach(() => {
  vi.unstubAllGlobals();
});

function respondWith(status: number) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: status < 400, status } as unknown as Response),
  );
}

describe('fetchProfileStatus', () => {
  it('reads a 2xx as a completed profile', async () => {
    respondWith(200);

    await expect(fetchProfileStatus('http://backend', identity)).resolves.toBe(
      'complete',
    );
  });

  it('reads a 404 as a user who has not onboarded', async () => {
    respondWith(404);

    await expect(fetchProfileStatus('http://backend', identity)).resolves.toBe(
      'missing',
    );
  });

  // Anything but a 404 leaves the question open, and the proxy must not send
  // an established user to the first-run form because the backend restarted.
  it.each([500, 502, 503])(
    'reads a %i as unknown, not missing',
    async (status) => {
      respondWith(status);

      await expect(
        fetchProfileStatus('http://backend', identity),
      ).resolves.toBe('unknown');
    },
  );

  it('reads a refused connection as unknown', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('fetch failed')),
    );

    await expect(fetchProfileStatus('http://backend', identity)).resolves.toBe(
      'unknown',
    );
  });
});
