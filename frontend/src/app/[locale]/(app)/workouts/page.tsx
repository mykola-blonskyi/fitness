import { getTranslations } from 'next-intl/server';
import { StartWorkoutForm, WorkoutLogList } from '@features/workout-logs';
import type { WorkoutLog } from '@shared/types/workout-log';
import type { TrainingProgram } from '@shared/types/training-program';
import { apiFetch } from '@libs/api-client';
import { todayIso } from '@libs/date';

export default async function WorkoutsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Workouts');
  const date = todayIso();

  const [workoutLogs, programs] = await Promise.all([
    apiFetch<WorkoutLog[]>('/workout-logs'),
    apiFetch<TrainingProgram[]>('/training-programs'),
  ]);
  const activePrograms = programs.filter((program) => program.isActive);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <h1 className="text-2xl font-extrabold md:text-[26px]">
        {t('pageTitle')}
      </h1>

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('startHeading')}</h2>
        <StartWorkoutForm
          locale={locale}
          date={date}
          activePrograms={activePrograms}
        />
      </section>

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('pastHeading')}</h2>
        <WorkoutLogList workoutLogs={workoutLogs} locale={locale} />
      </section>
    </main>
  );
}
