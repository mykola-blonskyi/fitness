'use client';

import { useEffect, useState } from 'react';

// Uses the browser's own online/offline signal rather than e.g. a
// periodic ping - same signal the service worker already relies on
// (public/sw.js); a false positive just means a write fails once and
// gets re-queued (network-error.ts).
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
