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
    <div className="grid grid-cols-3 gap-4 sm:max-w-md">
      <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500">{t('protein')}</span>
        <span className="text-lg font-medium">{proteinG}g</span>
      </div>
      <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500">{t('carbs')}</span>
        <span className="text-lg font-medium">{carbsG}g</span>
      </div>
      <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500">{t('fat')}</span>
        <span className="text-lg font-medium">{fatG}g</span>
      </div>
    </div>
  );
};
