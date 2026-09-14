import { getTranslations } from 'next-intl/server';

interface NutritionsInfoProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const NutritionsInfo = async ({
  proteinG,
  carbsG,
  fatG,
}: NutritionsInfoProps) => {
  const t = await getTranslations('Diet.nutritionsInfo');

  return (
    <div className="flex gap-6">
      <div className="flex flex-col">
        <span className="kicker">{t('protein')}</span>
        <span className="font-display text-[22px] font-extrabold tabular-nums tracking-tight">
          {t('gramsValue', { value: proteinG })}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="kicker">{t('carbs')}</span>
        <span className="font-display text-[22px] font-extrabold tabular-nums tracking-tight">
          {t('gramsValue', { value: carbsG })}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="kicker">{t('fat')}</span>
        <span className="font-display text-[22px] font-extrabold tabular-nums tracking-tight">
          {t('gramsValue', { value: fatG })}
        </span>
      </div>
    </div>
  );
};
