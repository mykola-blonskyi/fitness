import { isNetworkError } from './network-error';
import type { QueuedWrite, SyncHandler } from './types';

export interface DrainResult {
  // Whatever's left in the queue after this drain attempt - either
  // because a network failure stopped the drain early, or because an
  // item's type has no registered handler yet (see sync-registry.ts).
  remaining: QueuedWrite[];
  // Items that were removed from the queue because their handler threw
  // a non-network error - a poison item (e.g. the server genuinely
  // rejected the write) that would otherwise block every write behind
  // it in the queue forever.
  dropped: QueuedWrite[];
}

// Pure function, no I/O - mirrors calorie-targets/algorithms/mifflin-v1.ts
// and diets/greedy-heuristic.ts's split (docs/decisions.md ADR-010/011):
// the algorithm (flush queued writes in order, stop on the first sign
// connectivity is still bad) is unit-testable without a real store or
// IndexedDB; offline-queue-store.ts is the only caller and does the
// actual state/persistence glue.
//
// Writes flush strictly in submission order (AC: "flush... in
// submission order") - one at a time, never in parallel, so a later
// write can't land before an earlier one.
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
      // Nothing registered for this type on this page yet - leave it
      // (and everything behind it) queued rather than guessing.
      break;
    }

    try {
      await handler(item.payload);
      remaining.shift();
    } catch (err) {
      if (isNetworkError(err)) {
        // Still offline / connection dropped mid-drain - stop here,
        // the `online` listener (useOfflineSync.ts) will retry the
        // whole remaining queue next time connectivity returns.
        break;
      }
      // A real application-level rejection - drop this one item and
      // keep draining the rest, per this function's own doc comment.
      onDropped?.(item, err);
      dropped.push(item);
      remaining.shift();
    }
  }

  return { remaining, dropped };
}
