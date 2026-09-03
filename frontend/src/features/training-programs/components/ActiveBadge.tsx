import { getTranslations } from 'next-intl/server';

export async function ActiveBadge() {
  const t = await getTranslations('Training');
  return (
    <span className="rounded-full border border-emerald-600 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-500 dark:text-emerald-400">
      {t('activeBadge')}
    </span>
  );
}
