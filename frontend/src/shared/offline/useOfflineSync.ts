'use client';

import { useEffect } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineQueueStore } from './offline-queue-store';

// Drains the queue whenever back online: once after the persisted queue
// finishes hydrating (writes may be left from a previous session), and
// again on every 'online' event. drain() is a no-op when idle or already
// running (offline-queue-store.ts), so no extra guard is needed here.
export function useOfflineSync(userId: string): boolean {
  const isOnline = useOnlineStatus();
  const hasHydrated = useOfflineQueueStore((state) => state.hasHydrated);
  const setOwnerUserId = useOfflineQueueStore((state) => state.setOwnerUserId);
  const drain = useOfflineQueueStore((state) => state.drain);

  // Runs before the drain effect below so a previous user's queue
  // (shared device) is cleared before anything in it could be sent.
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
