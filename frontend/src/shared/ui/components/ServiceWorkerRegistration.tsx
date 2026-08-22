'use client';

import { useEffect } from 'react';

// Registers public/sw.js (FITNESS-12). Production-only, same reasoning
// as Sentry's own prod-only gating (docs/decisions.md ADR-006): a
// service worker caching build assets/pages would otherwise fight
// Fast Refresh and serve stale code during local `pnpm dev`.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // Best-effort: a registration failure shouldn't break the app,
      // just means this visit doesn't get offline/installable support.
      console.error('Service worker registration failed', err);
    });
  }, []);

  return null;
}
