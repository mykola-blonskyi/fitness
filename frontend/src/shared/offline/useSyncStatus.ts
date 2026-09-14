'use client';

import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineQueueStore } from './offline-queue-store';
import type { SyncStatus } from './types';

// A non-empty queue counts as "syncing" even before drain() starts -
// simpler than a separate "about to sync" state.
export function useSyncStatus(): SyncStatus {
  const isOnline = useOnlineStatus();
  const queueLength = useOfflineQueueStore((state) => state.queue.length);
  const isSyncing = useOfflineQueueStore((state) => state.isSyncing);
  const droppedCount = useOfflineQueueStore((state) => state.dropped.length);

  if (!isOnline) return 'offline';
  if (isSyncing || queueLength > 0) return 'syncing';
  if (droppedCount > 0) return 'failed';
  return 'synced';
}
