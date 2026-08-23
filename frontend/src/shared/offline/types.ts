// `type` is an opaque string a feature module picks; `payload` is
// plain-JSON data for that feature's Server Action to replay the write.
// See docs/decisions.md ADR-008.
export interface QueuedWrite<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  createdAt: number;
}

// Replays a write via the same Server Action used online; resolves on
// success, throws on failure (network vs. app error is distinguished by
// network-error.ts's isNetworkError).
export type SyncHandler<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
) => Promise<TResult>;

export type SyncStatus = 'offline' | 'syncing' | 'synced';
