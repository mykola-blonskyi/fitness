import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ActiveBadge,
  AddProgramExerciseForm,
  ProgramExerciseRow,
} from '@features/training-programs';
import {
  activateTrainingProgram,
  archiveTrainingProgram,
  deactivateTrainingProgram,
  reactivateTrainingProgram,
} from '@features/training-programs/actions';
import type { Exercise } from '@shared/types/exercise';
import type { TrainingProgram } from '@shared/types/training-program';
import { apiFetch, ApiError } from '@libs/api-client';

export default async function TrainingProgramDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  let program: TrainingProgram;
  try {
    program = await apiFetch<TrainingProgram>(`/training-programs/${id}`);
  } catch (err) {
    // Wrong id or owned by someone else - the backend never distinguishes
    // the two, so both are a plain 404.
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const exercises = await apiFetch<Exercise[]>('/exercises');

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16">
      <div>
        <Link
          href={`/${locale}/training`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          &larr; Training Programs
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{program.title}</h1>
            {program.isActive && <ActiveBadge />}
          </span>
          <div className="flex items-center gap-2">
            {!program.isArchived && (
              <form
                action={(program.isActive
                  ? deactivateTrainingProgram
                  : activateTrainingProgram
                ).bind(null, program.id)}
              >
                <button
                  type="submit"
                  className="flex h-11 items-center justify-center rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700"
                >
                  {program.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </form>
            )}
            <form
              action={(program.isArchived
                ? reactivateTrainingProgram
                : archiveTrainingProgram
              ).bind(null, program.id)}
            >
              <button
                type="submit"
                className="flex h-11 items-center justify-center rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700"
              >
                {program.isArchived ? 'Reactivate' : 'Archive'}
              </button>
            </form>
          </div>
        </div>
        {program.isArchived && (
          <p className="mt-1 text-sm text-zinc-500">
            This program is archived - reactivate it to make changes.
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2">
        {program.exercises.length === 0 && (
          <p className="text-sm text-zinc-500">
            No exercises yet. Add one below.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {program.exercises.map((exercise, index) => (
            <ProgramExerciseRow
              key={exercise.id}
              programId={program.id}
              exercise={exercise}
              isFirst={index === 0}
              isLast={index === program.exercises.length - 1}
              disabled={program.isArchived}
            />
          ))}
        </ul>
      </section>

      {!program.isArchived && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Add an exercise</h2>
          <AddProgramExerciseForm
            programId={program.id}
            exercises={exercises}
          />
        </section>
      )}
    </main>
  );
}
