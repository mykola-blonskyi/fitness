'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('ErrorPage');

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="card flex w-full max-w-md flex-col items-center gap-5 p-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-extrabold">{t('title')}</h1>
          <p className="text-sm text-muted">{t('body')}</p>
        </div>
        <button type="button" onClick={() => retry()} className="btn-primary">
          {t('retry')}
        </button>
        {error.digest && (
          <p className="font-mono text-[11px] text-muted">
            {t('reference', { digest: error.digest })}
          </p>
        )}
      </div>
    </main>
  );
}
