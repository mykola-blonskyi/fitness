import type { SyncHandler } from './types';

// In-memory only - deliberately never persisted alongside the queue
// itself. A Server Action reference can't survive a page reload or an
// IndexedDB round-trip, so a queued write stores only a `type` string
// plus a plain-JSON payload (see types.ts); whichever feature module
// registers that `type`'s handler - as a side effect of being imported,
// e.g. by rendering the form that owns it - supplies the actual
// function to call at drain time. See docs/decisions.md ADR-008.
//
// If a queued write's type has no registered handler yet (e.g. the
// queue survived a reload and the owning feature's client module hasn't
// been loaded on this page), drain-queue.ts leaves it queued rather
// than dropping it - it'll flush once a page that registers that type
// is visited.
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

// Test-only escape hatch - the module-level Map would otherwise leak
// registrations across test cases.
export function clearSyncHandlers(): void {
  handlers.clear();
}
