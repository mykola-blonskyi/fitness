'use client';

import { isSessionExpiredError } from '@libs/session-expired';
import { registerSyncHandler } from './sync-registry';
import { useOfflineQueueStore } from './offline-queue-store';
import { PermanentWriteError } from './types';
import type { SyncHandler } from './types';

export type SyncedWriteOutcome<TResult> =
  | { status: 'saved'; result: TResult }
  | { status: 'queued' }
  | { status: 'sessionExpired' };

export interface CreateSyncedWriteOptions<TResult> {
  // Server Actions resolve with `{ error }` on a refusal (form-action.ts)
  // but drain-queue.ts detects failure by a throw. Converts one to the
  // other for replay only; the immediate path still returns the raw result.
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
        if (error) throw new PermanentWriteError(error);
        return result;
      }
    : action;
  registerSyncHandler(type, replayHandler);

  return async (payload) => {
    const { enqueue } = useOfflineQueueStore.getState();

    // Known offline - skip the round-trip; it can only time out.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueue(type, payload);
      return { status: 'queued' };
    }

    try {
      const result = await action(payload);
      return { status: 'saved', result };
    } catch (err) {
      // Queueing an expired session would promise a flush that can never
      // happen; only the user re-authenticating clears it.
      if (isSessionExpiredError(err)) return { status: 'sessionExpired' };
      // A rejection means a retry can still clear it (offline, a backend
      // that is down or redeploying); a refusal resolves with `{ error }`.
      enqueue(type, payload);
      return { status: 'queued' };
    }
  };
}
