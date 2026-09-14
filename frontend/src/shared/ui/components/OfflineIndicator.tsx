'use client';

import { useTranslations } from 'next-intl';
import { useOfflineSync } from '@shared/offline/useOfflineSync';
import { useOfflineQueueStore } from '@shared/offline/offline-queue-store';
import { useSyncStatus } from '@shared/offline/useSyncStatus';
import type { SyncStatus } from '@shared/offline/types';

// Mounting this also starts the sync engine - useOfflineSync() wires the
// 'online' listener and triggers drain(). Rendered from Header.tsx,
// which per ADR-007 excludes /onboarding and /health from offline sync too.
//
// Color plus text label together, never color alone (accessibility).
const STATUS_DOT: Record<SyncStatus, string> = {
  offline: 'bg-muted',
  syncing: 'bg-warn animate-pulse',
  synced: 'bg-ok',
  failed: 'bg-danger',
};

export function OfflineIndicator({ userId }: { userId: string }) {
  useOfflineSync(userId);
  const status = useSyncStatus();
  const droppedCount = useOfflineQueueStore((state) => state.dropped.length);
  const t = useTranslations('OfflineIndicator');

  return (
    <span
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 text-xs text-ink"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`}
        aria-hidden="true"
      />
      {status === 'failed' ? t('failed', { count: droppedCount }) : t(status)}
    </span>
  );
}
