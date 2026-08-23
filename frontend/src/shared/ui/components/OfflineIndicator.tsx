'use client';

import { useOfflineSync } from '@shared/offline/useOfflineSync';
import { useSyncStatus } from '@shared/offline/useSyncStatus';
import type { SyncStatus } from '@shared/offline/types';

// Mounting this also starts the sync engine - useOfflineSync() wires the
// 'online' listener and triggers drain(). Rendered from Header.tsx,
// which per ADR-007 excludes /onboarding and /health from offline sync too.
//
// Color plus text label together, never color alone (accessibility).
const STATUS_COPY: Record<SyncStatus, { label: string; dot: string }> = {
  offline: { label: 'Offline', dot: 'bg-zinc-400' },
  syncing: { label: 'Syncing…', dot: 'bg-amber-500 animate-pulse' },
  synced: { label: 'Synced', dot: 'bg-emerald-500' },
};

export function OfflineIndicator({ userId }: { userId: string }) {
  useOfflineSync(userId);
  const status = useSyncStatus();
  const { label, dot } = STATUS_COPY[status];

  return (
    <span
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 text-xs text-zinc-500"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${dot}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
