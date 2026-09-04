'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { retryPhotoAnalysis } from '@features/photo-sessions/actions';

export function RetryAnalysisButton({ photoId }: { photoId: string }) {
  const t = useTranslations('PhotoSessions.retry');
  const [isRetrying, setIsRetrying] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  async function onRetry() {
    setFailed(false);
    setIsRetrying(true);
    try {
      await retryPhotoAnalysis(photoId);
      router.refresh();
    } catch {
      setFailed(true);
      setIsRetrying(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="text-xs text-muted underline hover:text-ink disabled:opacity-50"
      >
        {isRetrying ? t('retrying') : t('submit')}
      </button>
      {failed && <span className="text-xs text-warn">{t('error')}</span>}
    </div>
  );
}
