import { isNetworkError } from './network-error';
import type { QueuedWrite, SyncHandler } from './types';

export interface DrainResult {
  // Not yet attempted: a network failure stopped the drain, or the
  // item's type has no registered handler yet (sync-registry.ts).
  remaining: QueuedWrite[];
  // Removed because their handler threw a non-network error - a poison
  // item that would otherwise block everything queued behind it.
  dropped: QueuedWrite[];
}

// Pure, no I/O - testable without a real store or IndexedDB;
// offline-queue-store.ts is the only caller and owns the actual
// persistence.
export async function drainQueue(
  queue: readonly QueuedWrite[],
  resolveHandler: (type: string) => SyncHandler | undefined,
  onDropped?: (item: QueuedWrite, error: unknown) => void,
): Promise<DrainResult> {
  const remaining = [...queue];
  const dropped: QueuedWrite[] = [];

  while (remaining.length > 0) {
    const item = remaining[0];
    const handler = resolveHandler(item.type);

    if (!handler) {
      // No handler registered yet - leave it (and everything behind it) queued.
      break;
    }

    try {
      await handler(item.payload);
      remaining.shift();
    } catch (err) {
      if (isNetworkError(err)) {
        // Still offline mid-drain - stop; useOfflineSync's online
        // listener retries the rest later.
        break;
      }
      onDropped?.(item, err);
      dropped.push(item);
      remaining.shift();
    }
  }

  return { remaining, dropped };
}
