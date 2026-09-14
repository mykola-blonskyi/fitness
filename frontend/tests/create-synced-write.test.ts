import { afterEach, describe, expect, it } from 'vitest';
import { createSyncedWrite } from '@shared/offline/create-synced-write';
import {
  clearSyncHandlers,
  getSyncHandler,
} from '@shared/offline/sync-registry';
import { useOfflineQueueStore } from '@shared/offline/offline-queue-store';
import { PermanentWriteError } from '@shared/offline/types';

interface Result {
  error?: string;
}

describe('createSyncedWrite', () => {
  afterEach(() => {
    useOfflineQueueStore.setState({ queue: [] });
  });

  // Regression coverage for a real bug caught in review: setWeight (and
  // every other Server Action built on shared/libs/form-action.ts's
  // submitFormAction) resolves with `{ error }` on a genuine backend
  // rejection instead of throwing. Without getResultError, drain-queue.ts
  // would see that resolution as success and silently drop a queued
  // write the server actually rejected - these tests pin down that the
  // registered replay handler converts that shape into a thrown error
  // instead.
  it('registers a replay handler that resolves normally when the result carries no error', async () => {
    clearSyncHandlers();
    createSyncedWrite<{ n: number }, Result>('test/success', async () => ({}), {
      getResultError: (result) => result.error,
    });

    const handler = getSyncHandler('test/success')!;
    await expect(handler({ n: 1 })).resolves.toEqual({});
  });

  it('registers a replay handler that throws when the resolved result carries an error', async () => {
    clearSyncHandlers();
    createSyncedWrite<{ n: number }, Result>(
      'test/failure',
      async () => ({ error: 'rejected by server' }),
      { getResultError: (result) => result.error },
    );

    const handler = getSyncHandler('test/failure')!;
    await expect(handler({ n: 1 })).rejects.toThrow(PermanentWriteError);
  });

  it('queues the write when the action rejects instead of losing it', async () => {
    clearSyncHandlers();
    const write = createSyncedWrite<{ n: number }, Result>(
      'test/rejects',
      async () => {
        throw new Error('An error occurred in the Server Components render');
      },
    );

    await expect(write({ n: 1 })).resolves.toEqual({ queued: true });
    expect(useOfflineQueueStore.getState().queue).toHaveLength(1);
  });

  it('registers the raw action as the handler when no getResultError is supplied', async () => {
    clearSyncHandlers();
    createSyncedWrite<number, number>('test/raw', async (n) => n * 2);

    const handler = getSyncHandler('test/raw')!;
    await expect(handler(5)).resolves.toBe(10);
  });
});
