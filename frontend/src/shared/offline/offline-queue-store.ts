'use client';

import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import * as Sentry from '@sentry/nextjs';
import { drainQueue } from './drain-queue';
import { getSyncHandler } from './sync-registry';
import type { QueuedWrite } from './types';

// Zustand's persist defaults to localStorage; ADR-008 requires IndexedDB
// (localStorage is sync, a poor fit for a queue held for a while), so
// this swaps in an idb-keyval adapter.
const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => idbSet(name, value),
  removeItem: async (name) => idbDel(name),
};

interface OfflineQueueState {
  queue: QueuedWrite[];
  // Refused writes, kept so useSyncStatus.ts can surface them. Not
  // persisted: with no dismiss affordance, a reload is how the notice clears.
  dropped: QueuedWrite[];
  isSyncing: boolean;
  // Persist's IndexedDB read is async; draining before it resolves could
  // stomp on writes queued in a previous session. useOfflineSync.ts
  // waits for this before draining.
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  // Owner of the current queue contents. IndexedDB is shared per browser
  // origin, not per user - on a mismatch (shared-device user switch),
  // setOwnerUserId clears the queue instead of draining it under the
  // wrong identity.
  ownerUserId: string | null;
  setOwnerUserId: (userId: string) => void;
  enqueue: <TPayload>(type: string, payload: TPayload) => void;
  drain: () => Promise<void>;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      dropped: [],
      isSyncing: false,
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      ownerUserId: null,
      setOwnerUserId: (userId) => {
        const current = get().ownerUserId;
        if (current !== null && current !== userId) {
          set({ queue: [], dropped: [], ownerUserId: userId });
        } else {
          set({ ownerUserId: userId });
        }
      },

      enqueue: (type, payload) => {
        const item: QueuedWrite = {
          id: crypto.randomUUID(),
          type,
          payload,
          createdAt: Date.now(),
        };
        set((state) => ({ queue: [...state.queue, item] }));
      },

      drain: async () => {
        // Prevent concurrent drains - e.g. a stray 'online' event firing
        // again mid-drain must not process the same item twice.
        if (get().isSyncing) return;

        set({ isSyncing: true });
        try {
          const queued = get().queue;
          const { remaining, dropped } = await drainQueue(
            queued,
            getSyncHandler,
            (item, err) => {
              // Dropped items are unexpected failures, not routine
              // control flow - report to Sentry (ADR-006).
              Sentry.captureException(err, {
                extra: { queuedWriteType: item.type },
              });
            },
          );
          const retained = new Set(remaining.map((item) => item.id));
          const settled = new Set(
            queued
              .filter((item) => !retained.has(item.id))
              .map((item) => item.id),
          );
          // Recompute against the live queue, not the snapshot: a write
          // enqueued while the drain was in flight has to survive it.
          set((state) => ({
            queue: state.queue.filter((item) => !settled.has(item.id)),
            dropped: [...state.dropped, ...dropped],
          }));
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'fitness-offline-write-queue',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        queue: state.queue,
        ownerUserId: state.ownerUserId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error) state?.setHasHydrated(true);
      },
    },
  ),
);
