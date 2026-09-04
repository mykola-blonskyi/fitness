import { getTranslations } from 'next-intl/server';
import { WEIGHT_TREND_WINDOWS } from '@shared/constants/daily-log';
import Link from 'next/link';

interface WeightTrendProps {
  locale: string;
  windowDays: number;
}

export const WeightTrend = async ({ locale, windowDays }: WeightTrendProps) => {
  const t = await getTranslations('Diary.weightTrend');

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-bold">{t('heading')}</h2>
      <div className="flex rounded-full border border-line p-0.5">
        {WEIGHT_TREND_WINDOWS.map((window) => (
          <Link
            key={window}
            href={`/${locale}/diary?days=${window}`}
            className={
              window === windowDays
                ? 'rounded-full bg-inv px-3 py-1 text-xs font-semibold text-inv-ink'
                : 'rounded-full px-3 py-1 text-xs font-semibold text-muted transition-colors hover:text-ink'
            }
          >
            {t('window', { days: window })}
          </Link>
        ))}
      </div>
    </div>
  );
};
