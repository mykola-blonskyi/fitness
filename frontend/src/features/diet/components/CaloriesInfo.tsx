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
    <div className="flex flex-col gap-1">
      <p className="text-4xl font-semibold">
        {Math.round(calories)}{' '}
        <span className="text-lg font-normal text-zinc-500">{t('perDay')}</span>
      </p>
      <p className="text-sm text-zinc-500">
        {t('caloriesInfo.basedOn', { weight, unit, date })}
      </p>
    </div>
  );
};
