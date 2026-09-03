'use client';

import { useTranslations } from 'next-intl';
import { useGenerateDiet } from '@features/diet/use-generate-diet';
import { GenerateDietError } from '@features/diet/components/GenerateDietError';

export function GenerateMenuCta({ hasTarget }: { hasTarget: boolean }) {
  const t = useTranslations('Diet.generateMenuCta');
  const { run, isPending, error, preferencesBlocked } = useGenerateDiet();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={run}
        disabled={!hasTarget || isPending}
        className="bg-foreground text-background self-start rounded px-4 py-2 text-sm transition-opacity disabled:opacity-50"
      >
        {isPending ? t('generating') : t('generate')}
      </button>

      {!hasTarget && (
        <p className="text-sm text-zinc-500">{t('needsWeighIn')}</p>
      )}

      <GenerateDietError
        error={error}
        preferencesBlocked={preferencesBlocked}
      />
    </div>
  );
}
