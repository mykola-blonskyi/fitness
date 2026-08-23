'use client';

import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineQueueStore } from './offline-queue-store';
import type { SyncStatus } from './types';

// Derives the three states OfflineIndicator.tsx renders (AC: "a visible
// indicator distinguishes offline / syncing / synced states"). A
// non-empty queue counts as "syncing" even a moment before drain()
// actually starts running (e.g. right after coming back online) -
// simpler than a fourth "about to sync" state, and correct within one
// render.
export function useSyncStatus(): SyncStatus {
  const isOnline = useOnlineStatus();
  const queueLength = useOfflineQueueStore((state) => state.queue.length);
  const isSyncing = useOfflineQueueStore((state) => state.isSyncing);

  if (!isOnline) return 'offline';
  if (isSyncing || queueLength > 0) return 'syncing';
  return 'synced';
}
