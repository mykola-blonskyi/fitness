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

// Zustand's persist middleware defaults to localStorage - swapped for a
// tiny idb-keyval-backed adapter per docs/decisions.md ADR-008, which
// explicitly requires IndexedDB (localStorage is synchronous and a poor
// fit for a queue that may hold offline writes for a while).
const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => idbSet(name, value),
  removeItem: async (name) => idbDel(name),
};

interface OfflineQueueState {
  queue: QueuedWrite[];
  isSyncing: boolean;
  // Persist's IndexedDB read is async - draining before it resolves
  // could stomp on writes that were queued in a previous session and
  // haven't been loaded into `queue` yet. useOfflineSync.ts waits for
  // this before ever calling drain().
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  enqueue: <TPayload>(type: string, payload: TPayload) => void;
  drain: () => Promise<void>;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      enqueue: (type, payload) => {
        const item: QueuedWrite = {
          id: crypto.randomUUID(),
          type,
          payload,
          createdAt: Date.now(),
        };
        // Appended to the end - queue order is submission order, which
        // is what drainQueue relies on to flush in-order (AC).
        set((state) => ({ queue: [...state.queue, item] }));
      },

      drain: async () => {
        // Never run two drains concurrently - e.g. a stray 'online'
        // event firing again mid-drain (rapid connectivity flapping)
        // must not race with itself and process the same item twice.
        if (get().isSyncing) return;

        set({ isSyncing: true });
        try {
          const { remaining } = await drainQueue(
            get().queue,
            getSyncHandler,
            (item, err) => {
              // A dropped item is a real bug or a genuinely rejected
              // write, not expected control flow - worth knowing about
              // in production (docs/decisions.md ADR-006 scope: this is
              // an unhandled failure path, not a deliberate 4xx).
              Sentry.captureException(err, {
                extra: { queuedWriteType: item.type },
              });
            },
          );
          set({ queue: remaining });
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'fitness-offline-write-queue',
      storage: createJSONStorage(() => idbStorage),
      // Only the queue itself needs to survive a reload - isSyncing and
      // hasHydrated are runtime-only.
      partialize: (state) => ({ queue: state.queue }),
      onRehydrateStorage: () => (state, error) => {
        if (!error) state?.setHasHydrated(true);
      },
    },
  ),
);
