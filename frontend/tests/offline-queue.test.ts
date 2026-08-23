import { describe, expect, it, vi } from 'vitest';
import { drainQueue } from '@shared/offline/drain-queue';
import { isNetworkError } from '@shared/offline/network-error';
import {
  clearSyncHandlers,
  getSyncHandler,
  registerSyncHandler,
} from '@shared/offline/sync-registry';
import type { QueuedWrite, SyncHandler } from '@shared/offline/types';

function write(id: string, type = 'test/write'): QueuedWrite {
  return { id, type, payload: { id }, createdAt: 0 };
}

function payloadId(payload: unknown): string {
  return (payload as { id: string }).id;
}

describe('isNetworkError', () => {
  it('recognizes a failed-fetch TypeError', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('recognizes Firefox/Safari network error wording', () => {
    expect(
      isNetworkError(
        new TypeError('NetworkError when attempting to fetch resource'),
      ),
    ).toBe(true);
  });

  it('does not classify a validation/application error as a network error', () => {
    expect(isNetworkError(new Error('Weight must be greater than 0'))).toBe(
      false,
    );
  });

  it('does not classify an unrelated TypeError as a network error', () => {
    expect(isNetworkError(new TypeError('Cannot read properties'))).toBe(false);
  });
});

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

  it('stops on a network error and leaves the failed item plus everything after it queued', async () => {
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

  it('drops an item that fails with a non-network error and keeps draining the rest', async () => {
    const calls: string[] = [];
    const handler: SyncHandler = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error('rejected by server');
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
