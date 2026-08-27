import { StartWorkoutForm, WorkoutLogList } from '@features/workout-logs';
import type { WorkoutLog } from '@shared/types/workout-log';
import type { TrainingProgram } from '@shared/types/training-program';
import { apiFetch } from '@libs/api-client';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function WorkoutsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const date = todayIso();

  const [workoutLogs, programs] = await Promise.all([
    apiFetch<WorkoutLog[]>('/workout-logs'),
    apiFetch<TrainingProgram[]>('/training-programs'),
  ]);
  const activePrograms = programs.filter((program) => program.isActive);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Workouts</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Start a workout</h2>
        <StartWorkoutForm
          locale={locale}
          date={date}
          activePrograms={activePrograms}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Past workouts</h2>
        <WorkoutLogList workoutLogs={workoutLogs} locale={locale} />
      </section>
    </main>
  );
}
