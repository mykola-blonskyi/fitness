'use client';

import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineQueueStore } from './offline-queue-store';
import type { SyncStatus } from './types';

// A non-empty queue counts as "syncing" even a moment before drain()
// actually starts (e.g. right after reconnecting) - simpler than a
// fourth "about to sync" state.
export function useSyncStatus(): SyncStatus {
  const isOnline = useOnlineStatus();
  const queueLength = useOfflineQueueStore((state) => state.queue.length);
  const isSyncing = useOfflineQueueStore((state) => state.isSyncing);

  if (!isOnline) return 'offline';
  if (isSyncing || queueLength > 0) return 'syncing';
  return 'synced';
}
