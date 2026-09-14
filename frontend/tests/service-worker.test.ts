import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// sw.js is a classic worker script, so it is evaluated against stubbed
// worker globals rather than imported. Under jsdom import.meta.url is not a
// file: URL, hence the cwd-relative read (as in proxy-matcher.test.ts).
const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');

const ORIGIN = 'https://fitness.blonskyi.dev';
const RUNTIME_CACHE = 'fitness-runtime-v1';

type Listener = (event: unknown) => void;

function loadServiceWorker() {
  const listeners = new Map<string, Listener>();
  const deleted: string[] = [];

  const workerSelf = {
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, listener);
    },
    location: new URL(ORIGIN),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  const caches = {
    delete: vi.fn(async (name: string) => {
      deleted.push(name);
      return true;
    }),
    keys: vi.fn(async () => []),
    open: vi.fn(async () => ({
      match: vi.fn(async () => undefined),
      put: vi.fn(),
    })),
  };
  const fetchStub = vi.fn(async () => ({ ok: true, clone: () => ({}) }));

  new Function('self', 'caches', 'fetch', source)(
    workerSelf,
    caches,
    fetchStub,
  );

  return { deleted, onFetch: listeners.get('fetch')! };
}

function fetchEvent(url: string, init?: { method?: string; mode?: string }) {
  const waited: Promise<unknown>[] = [];
  return {
    request: {
      url,
      method: init?.method ?? 'GET',
      mode: init?.mode ?? 'no-cors',
    },
    respondWith: vi.fn(),
    waitUntil: vi.fn((promise: Promise<unknown>) => waited.push(promise)),
    waited,
  };
}

describe('service worker', () => {
  // Cached pages that survive sign-out reach the next person to go offline
  // and reload on the same device.
  it('drops the runtime cache when the sign-out POST passes through', async () => {
    const { deleted, onFetch } = loadServiceWorker();
    const event = fetchEvent(`${ORIGIN}/api/auth/signout`, {
      method: 'POST',
      mode: 'navigate',
    });

    onFetch(event);
    await Promise.all(event.waited);

    expect(deleted).toContain(RUNTIME_CACHE);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it('leaves the manifest to the network, since its content is per-user', () => {
    const { onFetch } = loadServiceWorker();
    const event = fetchEvent(`${ORIGIN}/manifest.webmanifest`);

    onFetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it('still answers an immutable asset from the cache', () => {
    const { onFetch } = loadServiceWorker();
    const event = fetchEvent(`${ORIGIN}/icons/icon-192.png`);

    onFetch(event);

    expect(event.respondWith).toHaveBeenCalled();
  });
});
