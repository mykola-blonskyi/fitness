'use client';

import { registerSyncHandler } from './sync-registry';
import { useOfflineQueueStore } from './offline-queue-store';
import { isNetworkError } from './network-error';
import type { SyncHandler } from './types';

export type SyncedWriteOutcome<TResult> =
  { queued: true } | { queued: false; result: TResult };

export interface CreateSyncedWriteOptions<TResult> {
  // Most Server Actions in this repo (setWeight, createFoodItem,
  // completeOnboarding, updateProfile - see shared/libs/form-action.ts's
  // own comment) resolve with a `{ error }`-shaped failure instead of
  // throwing, so drain-queue.ts's success/failure detection (which
  // relies on the handler throwing) would otherwise treat a genuine
  // backend rejection during replay as a delivered write and silently
  // drop it - the exact "queued write gets lost" bug this option
  // exists to close. Supply it to convert that resolved-but-failed
  // shape into a thrown error *for replay purposes only*; the immediate
  // (non-queued) path below still returns the raw result unchanged, so
  // a form's existing per-field error handling (e.g. WeightForm calling
  // setError for each fieldErrors entry) keeps working exactly as
  // before.
  getResultError?: (result: TResult) => string | undefined;
}

// The one integration point a feature's write flow needs (AC: "generic
// enough to be reused by a future write endpoint, not hardcoded to one
// feature"). Wraps an existing Server Action - the same one already
// used for the online path, per docs/decisions.md ADR-008 - so calling
// code gets a drop-in replacement that queues automatically instead of
// failing when offline, without needing its own online/offline
// branching.
//
// Also registers a drain-time handler for `type` (sync-registry.ts) as
// a side effect of this module loading, so a write queued in an earlier
// session can still flush once this module is imported again (e.g. the
// user reopens the page that owns this write) even if this particular
// function instance never gets called again.
//
// Usage (see features/daily-log/offline.ts for the concrete example):
//
//   export const syncedSetWeight = createSyncedWrite(
//     'daily-log/set-weight',
//     ({ date, input }) => setWeight(date, input),
//     { getResultError: (result) => result.error },
//   );
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

    // Known offline: skip the network round-trip entirely rather than
    // waiting on a call that can only time out (AC: "queued... rather
    // than failing").
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueue(type, payload);
      return { queued: true };
    }

    try {
      const result = await action(payload);
      return { queued: false, result };
    } catch (err) {
      // navigator.onLine can lag reality (a connection that just
      // dropped, or a flaky network the browser hasn't noticed yet) -
      // this is the fallback path for that case.
      if (isNetworkError(err)) {
        enqueue(type, payload);
        return { queued: true };
      }
      throw err;
    }
  };
}
