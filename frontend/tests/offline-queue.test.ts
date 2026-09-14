import { afterEach, describe, expect, it, vi } from 'vitest';
import { drainQueue } from '@shared/offline/drain-queue';
import { PermanentWriteError } from '@shared/offline/types';
import {
  clearSyncHandlers,
  getSyncHandler,
  registerSyncHandler,
} from '@shared/offline/sync-registry';
import { useOfflineQueueStore } from '@shared/offline/offline-queue-store';
import type { QueuedWrite, SyncHandler } from '@shared/offline/types';

function write(id: string, type = 'test/write'): QueuedWrite {
  return { id, type, payload: { id }, createdAt: 0 };
}

function payloadId(payload: unknown): string {
  return (payload as { id: string }).id;
}

describe('sync-registry', () => {
  it('returns the handler that was registered for a type', () => {
    clearSyncHandlers();
    const handler = vi.fn();
    registerSyncHandler('feature/write', handler);
    expect(getSyncHandler('feature/write')).toBe(handler);
  });

  it('returns undefined for an unregistered type', () => {
    clearSyncHandlers();
    expect(getSyncHandler('nothing/registered')).toBeUndefined();
  });

  it('clearSyncHandlers removes all registrations', () => {
    registerSyncHandler('feature/write', vi.fn());
    clearSyncHandlers();
    expect(getSyncHandler('feature/write')).toBeUndefined();
  });
});

describe('drainQueue', () => {
  it('flushes every item in submission order', async () => {
    const calls: string[] = [];
    const handler: SyncHandler = vi.fn(async (payload) => {
      calls.push(payloadId(payload));
    });

    const { remaining, dropped } = await drainQueue(
      [write('a'), write('b'), write('c')],
      () => handler,
    );

    expect(calls).toEqual(['a', 'b', 'c']);
    expect(remaining).toEqual([]);
    expect(dropped).toEqual([]);
  });

  it('stops on a transient failure and leaves the failed item plus everything after it queued', async () => {
    const calls: string[] = [];
    const handler: SyncHandler = vi
      .fn()
      .mockImplementationOnce(async (payload) => {
        calls.push(payloadId(payload));
      })
      .mockImplementationOnce(async () => {
        throw new TypeError('Failed to fetch');
      });

    const items = [write('a'), write('b'), write('c')];
    const { remaining, dropped } = await drainQueue(items, () => handler);

    expect(calls).toEqual(['a']);
    // 'a' flushed and was removed; 'b' (the failure) and 'c' stay queued.
    expect(remaining.map((item) => item.id)).toEqual(['b', 'c']);
    expect(dropped).toEqual([]);
  });

  it('drops an item the server refused outright and keeps draining the rest', async () => {
    const calls: string[] = [];
    const handler: SyncHandler = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new PermanentWriteError('rejected by server');
      })
      .mockImplementationOnce(async (payload) => {
        calls.push(payloadId(payload));
      });

    const onDropped = vi.fn();
    const items = [write('a'), write('b')];
    const { remaining, dropped } = await drainQueue(
      items,
      () => handler,
      onDropped,
    );

    expect(calls).toEqual(['b']);
    expect(remaining).toEqual([]);
    expect(dropped.map((item) => item.id)).toEqual(['a']);
    expect(onDropped).toHaveBeenCalledTimes(1);
    expect(onDropped).toHaveBeenCalledWith(items[0], expect.any(Error));
  });

  it('retains a write the backend failed to accept rather than dropping it', async () => {
    // A 502 from a redeploying backend reaches the client as an opaque
    // rejection, not a TypeError.
    const handler: SyncHandler = vi.fn(async () => {
      throw new Error('An error occurred in the Server Components render');
    });

    const onDropped = vi.fn();
    const items = [write('a'), write('b')];
    const { remaining, dropped } = await drainQueue(
      items,
      () => handler,
      onDropped,
    );

    expect(remaining.map((item) => item.id)).toEqual(['a', 'b']);
    expect(dropped).toEqual([]);
    expect(onDropped).not.toHaveBeenCalled();
  });

  it('moves a write with no handler behind the writes that have one', async () => {
    const calls: string[] = [];
    const handler: SyncHandler = vi.fn(async (payload) => {
      calls.push(payloadId(payload));
    });

    const items = [
      write('weight', 'daily-log/set-weight'),
      write('set-1'),
      write('set-2'),
    ];
    const { remaining, dropped } = await drainQueue(items, (type) =>
      type === 'test/write' ? handler : undefined,
    );

    expect(calls).toEqual(['set-1', 'set-2']);
    expect(remaining.map((item) => item.id)).toEqual(['weight']);
    expect(dropped).toEqual([]);
  });

  it('leaves everything queued when a type has no registered handler', async () => {
    const items = [write('a'), write('b')];
    const { remaining, dropped } = await drainQueue(items, () => undefined);

    expect(remaining).toEqual(items);
    expect(dropped).toEqual([]);
  });

  it('processes writes one at a time, never in parallel', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const handler = vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
    });

    await drainQueue([write('a'), write('b'), write('c')], () => handler);

    expect(maxInFlight).toBe(1);
  });
});

describe('offline-queue-store drain', () => {
  afterEach(() => {
    clearSyncHandlers();
    useOfflineQueueStore.setState({ queue: [], dropped: [] });
  });

  it('keeps a write enqueued while the drain was in flight', async () => {
    registerSyncHandler('test/write', async () => {
      useOfflineQueueStore.getState().enqueue('test/write', { id: 'b' });
    });
    useOfflineQueueStore.setState({ queue: [write('a')], dropped: [] });

    await useOfflineQueueStore.getState().drain();

    expect(
      useOfflineQueueStore.getState().queue.map((item) => item.payload),
    ).toEqual([{ id: 'b' }]);
  });

  it('keeps refused writes so the user can be told they never landed', async () => {
    registerSyncHandler('test/write', async () => {
      throw new PermanentWriteError('rejected by server');
    });
    useOfflineQueueStore.setState({ queue: [write('a')], dropped: [] });

    await useOfflineQueueStore.getState().drain();

    expect(useOfflineQueueStore.getState().queue).toEqual([]);
    expect(
      useOfflineQueueStore.getState().dropped.map((item) => item.id),
    ).toEqual(['a']);
  });
});

describe('offline-queue-store ownerUserId', () => {
  it('accepts the first user seen with no data loss', () => {
    useOfflineQueueStore.setState({ ownerUserId: null, queue: [write('a')] });
    useOfflineQueueStore.getState().setOwnerUserId('user-a');
    expect(useOfflineQueueStore.getState().ownerUserId).toBe('user-a');
    expect(useOfflineQueueStore.getState().queue).toHaveLength(1);
  });

  it('clears the queue instead of draining it under a different user', () => {
    useOfflineQueueStore.setState({
      ownerUserId: 'user-a',
      queue: [write('a'), write('b')],
      dropped: [write('c')],
    });
    useOfflineQueueStore.getState().setOwnerUserId('user-b');
    expect(useOfflineQueueStore.getState().ownerUserId).toBe('user-b');
    expect(useOfflineQueueStore.getState().queue).toEqual([]);
    expect(useOfflineQueueStore.getState().dropped).toEqual([]);
  });

  it('is a no-op for the same user', () => {
    useOfflineQueueStore.setState({
      ownerUserId: 'user-a',
      queue: [write('a')],
    });
    useOfflineQueueStore.getState().setOwnerUserId('user-a');
    expect(useOfflineQueueStore.getState().queue).toHaveLength(1);
  });
});
