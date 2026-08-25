import Link from 'next/link';
import { StartWorkoutForm } from '@features/workout-logs';
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
        {workoutLogs.length === 0 && (
          <p className="text-sm text-zinc-500">No workouts logged yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {workoutLogs.map((log) => (
            <li
              key={log.id}
              className="rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <Link
                href={`/${locale}/workouts/${log.id}`}
                className="flex flex-col gap-1"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{log.title}</span>
                  <span className="text-sm text-zinc-500">{log.date}</span>
                </span>
                <span className="text-sm text-zinc-500">
                  {log.sets.length} {log.sets.length === 1 ? 'set' : 'sets'}{' '}
                  logged
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
