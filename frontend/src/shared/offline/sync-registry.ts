import type { SyncHandler } from './types';

// In-memory only - a Server Action reference can't survive a reload or an
// IndexedDB round-trip, so a queued write stores just a `type` string
// (types.ts); the owning feature module registers the real handler as a
// side effect of being imported. If nothing's registered yet for a type,
// drain-queue.ts leaves it queued rather than dropping it.
const handlers = new Map<string, SyncHandler>();

export function registerSyncHandler<TPayload, TResult>(
  type: string,
  handler: SyncHandler<TPayload, TResult>,
): void {
  handlers.set(type, handler as SyncHandler);
}

export function getSyncHandler(type: string): SyncHandler | undefined {
  return handlers.get(type);
}

// Test-only: clears registrations so they don't leak across test cases.
export function clearSyncHandlers(): void {
  handlers.clear();
}
