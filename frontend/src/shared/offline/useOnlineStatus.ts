'use client';

import { useEffect, useState } from 'react';

// Uses the browser's own online/offline signal rather than e.g. a
// periodic ping - same signal the service worker already relies on
// (public/sw.js); a false positive just means a write fails once and
// gets re-queued (create-synced-write.ts).
//
// Guard is `typeof window`, not `typeof navigator`: Node 19+ ships a
// built-in `navigator` with no `onLine`, so the old check read as
// offline on the server and mismatched on hydration (React #418).
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    () => typeof window === 'undefined' || navigator.onLine,
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
