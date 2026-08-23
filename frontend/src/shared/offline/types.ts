// Generic offline write-queue types (FITNESS-13). Nothing here knows
// about any specific feature (weight logging, future workout-set
// logging, etc.) - `type` is just an opaque string a feature module
// picks and a `payload` is whatever plain-JSON data that feature's
// Server Action needs to replay the write. See docs/decisions.md
// ADR-008 for why this exists and how sync is expected to work.
export interface QueuedWrite<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  createdAt: number;
}

// A handler replays one queued write by calling the same Server Action
// the online path already uses (ADR-008) - it either resolves (the
// write landed) or throws (network failure or a real application
// error, distinguished by network-error.ts's isNetworkError).
export type SyncHandler<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
) => Promise<TResult>;

// Drives the OfflineIndicator UI (AC: "a visible indicator distinguishes
// offline / syncing / synced states").
export type SyncStatus = 'offline' | 'syncing' | 'synced';
