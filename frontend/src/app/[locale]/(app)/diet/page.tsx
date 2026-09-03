import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { fetchOr404 } from '@libs/api-client';
import type { CalorieTarget, DietResponse } from '@features/diet/actions';
import {
  AlgorithmInfo,
  CaloriesInfo,
  DietMenu,
  GenerateMenuCta,
  NutritionsInfo,
} from '@features/diet';

export default async function DietPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Diet.page');

  const [target, diet] = await Promise.all([
    fetchOr404<CalorieTarget>('/calorie-targets'),
    fetchOr404<DietResponse>('/diets/current'),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      {!target && (
        <p className="text-sm text-zinc-500">
          {t.rich('noTargetYet', {
            diary: (chunks) => (
              <Link href={`/${locale}/diary`} className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}

      {target && (
        <div className="flex flex-col gap-6">
          <CaloriesInfo
            calories={target.calories}
            weight={target.weighIn.weight}
            unit={target.weighIn.unit}
            date={target.weighIn.date}
          />

          <NutritionsInfo
            proteinG={target.proteinG}
            carbsG={target.carbsG}
            fatG={target.fatG}
          />

          <AlgorithmInfo
            name={target.algorithm.name}
            code={target.algorithm.code}
            description={target.algorithm.description}
          />
        </div>
      )}

      {diet ? (
        <DietMenu diet={diet} />
      ) : (
        <GenerateMenuCta hasTarget={Boolean(target)} />
      )}
    </main>
  );
}
