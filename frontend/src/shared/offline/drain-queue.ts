import { PermanentWriteError } from './types';
import type { QueuedWrite, SyncHandler } from './types';

export interface DrainResult {
  remaining: QueuedWrite[];
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
  const rotated = new Set<string>();

  while (remaining.length > 0) {
    const item = remaining[0];
    const handler = resolveHandler(item.type);

    if (!handler) {
      // A route's handlers register only when its offline.ts is imported,
      // and Next code-splits per route - an unknown type must not block the rest.
      if (rotated.has(item.id)) break;
      rotated.add(item.id);
      remaining.shift();
      remaining.push(item);
      continue;
    }

    try {
      await handler(item.payload);
      remaining.shift();
    } catch (err) {
      if (!(err instanceof PermanentWriteError)) {
        // Keep it and everything behind it - the queue replays in order.
        break;
      }
      onDropped?.(item, err);
      dropped.push(item);
      remaining.shift();
    }
  }

  return { remaining, dropped };
}
