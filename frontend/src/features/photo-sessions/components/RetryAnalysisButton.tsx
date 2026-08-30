'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { retryPhotoAnalysis } from '@features/photo-sessions/actions';

export function RetryAnalysisButton({ photoId }: { photoId: string }) {
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
        className="text-xs text-zinc-500 underline hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
      >
        {isRetrying ? 'Retrying…' : 'Retry'}
      </button>
      {failed && (
        <span className="text-xs text-amber-700 dark:text-amber-300">
          Couldn&apos;t retry — try again.
        </span>
      )}
    </div>
  );
}
