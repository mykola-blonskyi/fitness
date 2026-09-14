// `type` is an opaque string a feature module picks; `payload` is
// plain-JSON data for that feature's Server Action to replay the write.
// See docs/decisions.md ADR-008.
export interface QueuedWrite<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  createdAt: number;
}

// Replays a write through the same Server Action the online path uses.
export type SyncHandler<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
) => Promise<TResult>;

// A refusal on the merits (validation, 4xx): a replay fails the same way,
// so drain-queue.ts drops it. No status survives the Server Action boundary.
export class PermanentWriteError extends Error {}

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'failed';
