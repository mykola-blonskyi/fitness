'use client';

import { useEffect, useState } from 'react';

// Tracks the browser's own connectivity signal (navigator.onLine plus
// the 'online'/'offline' window events that fire when it changes).
// Doesn't attempt anything smarter (e.g. a periodic ping) - the
// online/offline events are the same boring, proven signal the service
// worker's own design already leans on (see public/sw.js), and a false
// positive here just means a queued write's first flush attempt fails
// and gets re-queued (network-error.ts), not a stuck state.
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
