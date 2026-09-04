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
import { Page, PageHeader, Section } from '@shared/ui/components/Page';

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
    <Page>
      <PageHeader
        title={t('title')}
        description={
          !target &&
          t.rich('noTargetYet', {
            diary: (chunks) => (
              <Link href={`/${locale}/diary`} className="underline">
                {chunks}
              </Link>
            ),
          })
        }
      />

      {target && (
        <Section>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
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
          </div>
          <AlgorithmInfo
            name={target.algorithm.name}
            code={target.algorithm.code}
            description={target.algorithm.description}
          />
        </Section>
      )}

      <Section>
        {diet ? (
          <DietMenu diet={diet} />
        ) : (
          <GenerateMenuCta hasTarget={Boolean(target)} />
        )}
      </Section>
    </Page>
  );
}
