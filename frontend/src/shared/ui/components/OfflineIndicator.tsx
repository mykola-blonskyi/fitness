'use client';

import { useOfflineSync } from '@shared/offline/useOfflineSync';
import { useSyncStatus } from '@shared/offline/useSyncStatus';
import type { SyncStatus } from '@shared/offline/types';

// FITNESS-13's visible offline/syncing/synced indicator (AC). Mounting
// this component is also what starts the sync engine on a given page -
// useOfflineSync() wires the 'online' listener and triggers drain() -
// so it's rendered once, here, from Header.tsx (which per ADR-007
// already excludes /onboarding and /health, so those two routes don't
// get offline sync either; acceptable, they're not write-heavy flows).
//
// Dot color plus a text label together (never color alone), per this
// repo's ui-ux-pro-max accessibility guidance.
const STATUS_COPY: Record<SyncStatus, { label: string; dot: string }> = {
  offline: { label: 'Offline', dot: 'bg-zinc-400' },
  syncing: { label: 'Syncing…', dot: 'bg-amber-500 animate-pulse' },
  synced: { label: 'Synced', dot: 'bg-emerald-500' },
};

export function OfflineIndicator() {
  useOfflineSync();
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
