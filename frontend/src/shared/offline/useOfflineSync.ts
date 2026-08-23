'use client';

import { useEffect } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineQueueStore } from './offline-queue-store';

// The engine half of the offline write-queue (OfflineIndicator.tsx is
// the display half - they're mounted together, see that component).
// Attempts to drain the queue whenever the browser is online: once
// right after the persisted queue finishes loading from IndexedDB (in
// case writes were queued in a previous session and never flushed
// before the tab closed), and again every time the 'online' event
// fires (AC: "flush... automatically once connectivity returns").
//
// drain() itself is a no-op when there's nothing queued or a drain is
// already running (offline-queue-store.ts), so calling it eagerly here
// is cheap and doesn't need its own guard.
export function useOfflineSync(userId: string): boolean {
  const isOnline = useOnlineStatus();
  const hasHydrated = useOfflineQueueStore((state) => state.hasHydrated);
  const setOwnerUserId = useOfflineQueueStore((state) => state.setOwnerUserId);
  const drain = useOfflineQueueStore((state) => state.drain);

  // Runs before the drain effect below on every render where hasHydrated
  // just became true, so a queue left behind by a different user (shared
  // device) is cleared before anything in it could be sent.
  useEffect(() => {
    if (hasHydrated) {
      setOwnerUserId(userId);
    }
  }, [hasHydrated, userId, setOwnerUserId]);

  useEffect(() => {
    if (isOnline && hasHydrated) {
      void drain();
    }
  }, [isOnline, hasHydrated, drain]);

  return isOnline;
}
