// jsdom (this suite's test environment) has no real IndexedDB - needed
// because shared/offline/offline-queue-store.ts (FITNESS-13) persists
// via idb-keyval, and importing it (even indirectly, e.g. through
// create-synced-write.ts) touches indexedDB at module load time.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
