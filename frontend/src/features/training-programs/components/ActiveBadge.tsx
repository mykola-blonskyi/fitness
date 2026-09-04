import { getTranslations } from 'next-intl/server';

export async function ActiveBadge() {
  const t = await getTranslations('Training');
  return (
    <span className="rounded-full bg-ok-soft px-2 py-0.5 align-middle text-[11px] font-bold text-ok">
      {t('activeBadge')}
    </span>
  );
}
