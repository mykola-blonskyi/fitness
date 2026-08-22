// FITNESS-12: minimal, hand-rolled service worker (no Workbox/next-pwa -
// this is the whole scope of the ticket, not worth a new dependency for).
//
// Strategy:
//  - Navigation requests (full page loads/reloads): network-first, with
//    the last successful response cached so a reload works offline too.
//    This is what makes "at least one authenticated route survives
//    reloading offline" true for whichever page the user last visited
//    online - no route is special-cased, any visited page qualifies.
//  - Same-origin build assets (/_next/static/*) and the small fixed set
//    of app-shell files (manifest, icons, favicon) are cache-first -
//    the former are content-hashed and therefore immutable, the latter
//    change rarely and are cheap to keep fresh via the cache's normal
//    put-on-fetch behavior.
//  - Everything else (cross-origin requests, non-GET, API calls) is left
//    alone and goes straight to the network, unmodified.
//
// Deliberately out of scope here (see docs/decisions.md ADR-008 /
// knowledge/business-rules.md "PWA offline supports queued writes"):
// the IndexedDB write-queue for offline workout-set logging is
// FITNESS-13, built on top of this service worker once it lands.
//
// Why caching just the navigation HTML is enough (not a partial shell):
// this app has no client-side data fetching yet (no TanStack Query per
// ADR-008, no `fetch()` in any 'use client' component) - every
// authenticated page is a Server Component that bakes its data straight
// into the HTML Next.js renders server-side. There's no follow-up
// client fetch that could fail once the cached HTML is served offline.
// This will need revisiting if/when a page starts fetching data
// client-side after hydration.
//
// Known tradeoff, accepted rather than solved here: cached HTML persists
// in Cache Storage indefinitely (no TTL, no clear-on-logout - this app
// has no sign-out at all yet, see ADR-007's Consequences), so a shared
// or borrowed device retains whatever personal data (weight, diary
// entries) was last cached. ADR-002 only covers progress-photo storage
// specifically, so this isn't a documented-standard violation, but the
// same "don't keep sensitive data around longer than needed" spirit
// applies. Revisit alongside FITNESS-13 or whenever a real sign-out
// path exists to clear this cache on demand.

const CACHE_VERSION = 'v1';
const RUNTIME_CACHE = `fitness-runtime-${CACHE_VERSION}`;

self.addEventListener('install', () => {
  // Activate a new SW as soon as it's installed rather than waiting for
  // all tabs of the old one to close - this is a small, low-risk cache
  // layer (no write-queue yet to worry about losing), so faster updates
  // matter more than strict versioning discipline here.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/apple-touch-icon.png'
  ) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}
