import Link from 'next/link';
import { apiFetch, ApiError } from '@libs/api-client';

// Mirrors backend/src/calorie-targets/calorie-target.mapper.ts's
// CalorieTargetResponse. No Server Action needed - this is a pure read,
// same as the diary page's DailyLog fetch.
interface CalorieTarget {
  algorithm: {
    code: string;
    name: string;
    description: string;
    formula: string;
  };
  weighIn: {
    weight: number;
    date: string;
  };
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export default async function DietPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  let target: CalorieTarget | null = null;
  try {
    target = await apiFetch<CalorieTarget>('/calorie-target');
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
          <div className="flex flex-col gap-1">
            <p className="text-4xl font-semibold">
              {Math.round(target.calories)}{' '}
              <span className="text-lg font-normal text-zinc-500">
                kcal / day
              </span>
            </p>
            <p className="text-sm text-zinc-500">
              Based on your {target.weighIn.weight}kg weigh-in on{' '}
              {target.weighIn.date}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:max-w-md">
            <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
              <span className="text-sm text-zinc-500">Protein</span>
              <span className="text-lg font-medium">{target.proteinG}g</span>
            </div>
            <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
              <span className="text-sm text-zinc-500">Carbs</span>
              <span className="text-lg font-medium">{target.carbsG}g</span>
            </div>
            <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
              <span className="text-sm text-zinc-500">Fat</span>
              <span className="text-lg font-medium">{target.fatG}g</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
            <p>
              Calculated using <strong>{target.algorithm.name}</strong> (
              {target.algorithm.code})
            </p>
            <p>{target.algorithm.description}</p>
          </div>
        </div>
      )}
    </main>
  );
}
