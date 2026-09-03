'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deletePhotoSession } from '@features/photo-sessions/actions';

export function DeleteSessionButton({
  sessionId,
  isBaseline,
  redirectTo,
}: {
  sessionId: string;
  isBaseline?: boolean;
  redirectTo?: string;
}) {
  const t = useTranslations('PhotoSessions.delete');
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  async function onConfirm() {
    setFailed(false);
    setIsDeleting(true);
    try {
      await deletePhotoSession(sessionId);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch {
      setFailed(true);
      setIsDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded border border-red-300 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        {t('submit')}
      </button>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">
          {isBaseline ? t('confirmBaseline') : t('confirmPlain')}
        </span>
        <button
          type="button"
          disabled={isDeleting}
          onClick={onConfirm}
          className="rounded bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          {isDeleting ? t('confirming') : t('confirm')}
        </button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => setConfirming(false)}
          className="rounded border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50 dark:border-zinc-700"
        >
          {t('cancel')}
        </button>
      </div>
      {failed && (
        <span className="text-xs text-amber-700 dark:text-amber-300">
          {t('error')}
        </span>
      )}
    </div>
  );
}
