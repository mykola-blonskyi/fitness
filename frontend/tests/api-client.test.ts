import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@shared/libs/api-client';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@sentry/nextjs', () => ({ setUser: vi.fn() }));

const identity = { sub: 'user-1', email: 'user@example.com' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('reports a refused connection as a 503, so the offline queue retries the write instead of dropping it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('fetch failed')),
    );

    await expect(
      apiFetch('/weights', undefined, identity),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('keeps the backend status when the backend did answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ message: 'already logged' }),
      } as unknown as Response),
    );

    await expect(
      apiFetch('/weights', undefined, identity),
    ).rejects.toMatchObject({ status: 409, message: 'already logged' });
  });
});
