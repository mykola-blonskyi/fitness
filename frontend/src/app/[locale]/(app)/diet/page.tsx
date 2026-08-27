import Link from 'next/link';
import { apiFetch, ApiError } from '@libs/api-client';
import type { CalorieTarget } from '@features/diet/actions';
import { AlgorithmInfo, CaloriesInfo, NutritionsInfo } from '@features/diet';

export default async function DietPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  let target: CalorieTarget | null = null;
  try {
    target = await apiFetch<CalorieTarget>('/calorie-targets');
  } catch (err) {
    // No weigh-in yet is expected for a new user - anything else (auth
    // failure, backend down) should surface as a real error, same
    // pattern as the diary page's DailyLog 404 handling.
    if (!(err instanceof ApiError && err.status === 404)) {
      throw err;
    }
    target = null;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Diet</h1>

      {!target && (
        <p className="text-sm text-zinc-500">
          Log today&apos;s weight in your{' '}
          <Link href={`/${locale}/diary`} className="underline">
            Diary
          </Link>{' '}
          to see your daily calorie and macro targets.
        </p>
      )}

      {target && (
        <div className="flex flex-col gap-6">
          <CaloriesInfo
            calories={target.calories}
            weight={target.weighIn.weight}
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
    </main>
  );
}
