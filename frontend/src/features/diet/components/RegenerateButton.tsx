'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGenerateDiet } from '@features/diet/use-generate-diet';
import { GenerateDietError } from '@features/diet/components/GenerateDietError';

export function RegenerateButton() {
  const t = useTranslations('Diet.regenerateButton');
  const { run, isPending, error, preferencesBlocked } = useGenerateDiet();
  const [confirming, setConfirming] = useState(false);

  async function onConfirm() {
    const done = await run();
    if (done) setConfirming(false);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="btn-ghost self-start"
        >
          {t('regenerate')}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t('confirmMessage')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? t('regenerating') : t('regenerateMenu')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="btn-ghost"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <GenerateDietError
        error={error}
        preferencesBlocked={preferencesBlocked}
      />
    </div>
  );
}
