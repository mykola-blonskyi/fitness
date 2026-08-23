'use client';

import { useEffect } from 'react';

// Production-only: a service worker caching build assets/pages would
// otherwise fight Fast Refresh and serve stale code during `pnpm dev`.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed', err);
    });
  }, []);

  return null;
}
