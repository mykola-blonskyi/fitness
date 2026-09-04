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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <div>
        <Link
          href={`/${locale}/workouts`}
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          &larr; {t('backLink')}
        </Link>
        <h1 className="text-2xl font-extrabold md:text-[26px]">
          {workoutLog.title}
        </h1>
        <p className="text-sm text-muted">{workoutLog.date}</p>
      </div>

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('setsHeading')}</h2>
        <WorkoutSetList
          workoutLogId={workoutLog.id}
          sets={workoutLog.sets}
          exercises={exercises}
        />
      </section>

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('logSetHeading')}</h2>
        <LogSetForm
          workoutLogId={workoutLog.id}
          exercises={exercises}
          defaultWeightUnit={profile.defaultWeightUnit}
        />
      </section>
    </main>
  );
}
