'use client';

import { registerSyncHandler } from './sync-registry';
import { useOfflineQueueStore } from './offline-queue-store';
import { isNetworkError } from './network-error';
import type { SyncHandler } from './types';

export type SyncedWriteOutcome<TResult> =
  { queued: true } | { queued: false; result: TResult };

export interface CreateSyncedWriteOptions<TResult> {
  // Many Server Actions resolve with `{ error }` on failure instead of
  // throwing (shared/libs/form-action.ts), but drain-queue.ts detects
  // failure by a thrown error. Supply this to convert a resolved-but-
  // failed result into a throw for replay only; the immediate path below
  // still returns the raw result, so existing per-field error handling
  // keeps working.
  getResultError?: (result: TResult) => string | undefined;
}

// Wraps a Server Action so calling code gets offline queueing for free
// instead of failing when offline. Also registers a drain-time handler
// for `type` as a side effect of import, so a write queued in an earlier
// session flushes once this module loads again (sync-registry.ts).
export function createSyncedWrite<TPayload, TResult>(
  type: string,
  action: SyncHandler<TPayload, TResult>,
  options?: CreateSyncedWriteOptions<TResult>,
): (payload: TPayload) => Promise<SyncedWriteOutcome<TResult>> {
  const getResultError = options?.getResultError;

  const replayHandler: SyncHandler<TPayload, TResult> = getResultError
    ? async (payload) => {
        const result = await action(payload);
        const error = getResultError(result);
        if (error) throw new Error(error);
        return result;
      }
    : action;
  registerSyncHandler(type, replayHandler);

  return async (payload) => {
    const { enqueue } = useOfflineQueueStore.getState();

    // Known offline - skip the round-trip; it can only time out.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueue(type, payload);
      return { queued: true };
    }

    try {
      const result = await action(payload);
      return { queued: false, result };
    } catch (err) {
      // Fallback for when navigator.onLine lags reality (a connection
      // that just dropped, or a flaky network the browser hasn't noticed).
      if (isNetworkError(err)) {
        enqueue(type, payload);
        return { queued: true };
      }
      throw err;
    }
  };
}
