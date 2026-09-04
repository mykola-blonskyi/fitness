import { getTranslations } from 'next-intl/server';
import type { WeightUnit } from '@shared/types/user';

interface CaloriesInfoProps {
  calories: number;
  weight: number;
  unit: WeightUnit;
  date: string;
}

export const CaloriesInfo = async ({
  calories,
  weight,
  unit,
  date,
}: CaloriesInfoProps) => {
  const t = await getTranslations('Diet');

  return (
    <div className="flex flex-col">
      <span className="kicker">{t('targetLabel')}</span>
      <p className="font-display text-4xl font-extrabold tabular-nums tracking-tight">
        {Math.round(calories)}{' '}
        <span className="text-sm font-medium text-muted">{t('perDay')}</span>
      </p>
      <p className="text-xs text-muted">
        {t('caloriesInfo.basedOn', { weight, unit, date })}
      </p>
    </div>
  );
};
