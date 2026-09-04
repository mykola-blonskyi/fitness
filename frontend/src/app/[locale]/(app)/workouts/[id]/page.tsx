import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { LogSetForm, WorkoutSetList } from '@features/workout-logs';
import type { Exercise } from '@shared/types/exercise';
import type { WorkoutLog } from '@shared/types/workout-log';
import type { UserProfile } from '@shared/types/user';
import { apiFetch, ApiError } from '@libs/api-client';

export default async function WorkoutLogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('Workouts');

  let workoutLog: WorkoutLog;
  try {
    workoutLog = await apiFetch<WorkoutLog>(`/workout-logs/${id}`);
  } catch (err) {
    // Wrong id or owned by someone else - the backend never distinguishes
    // the two, so both are a plain 404.
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const [exercises, profile] = await Promise.all([
    apiFetch<Exercise[]>('/exercises'),
    apiFetch<UserProfile>('/users/me'),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16">
      <div>
        <Link
          href={`/${locale}/workouts`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          &larr; {t('backLink')}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{workoutLog.title}</h1>
        <p className="text-sm text-zinc-500">{workoutLog.date}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t('setsHeading')}</h2>
        <WorkoutSetList
          workoutLogId={workoutLog.id}
          sets={workoutLog.sets}
          exercises={exercises}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('logSetHeading')}</h2>
        <LogSetForm
          workoutLogId={workoutLog.id}
          exercises={exercises}
          defaultWeightUnit={profile.defaultWeightUnit}
        />
      </section>
    </main>
  );
}
