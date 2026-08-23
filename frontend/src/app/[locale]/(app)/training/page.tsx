import Link from 'next/link';
import { CreateTrainingProgramForm } from '@features/training-programs';
import {
  archiveTrainingProgram,
  reactivateTrainingProgram,
} from '@features/training-programs/actions';
import type { TrainingProgram } from '@shared/types/training-program';
import { apiFetch } from '@libs/api-client';

// Splits the single list() response into active/archived sections here
// so users can find something to reactivate.
export default async function TrainingProgramsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const programs = await apiFetch<TrainingProgram[]>('/training-programs');
  const active = programs.filter((program) => !program.isArchived);
  const archived = programs.filter((program) => program.isArchived);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Training Programs</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Active</h2>
        {active.length === 0 && (
          <p className="text-sm text-zinc-500">No active programs yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {active.map((program) => (
            <li
              key={program.id}
              className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <Link
                href={`/${locale}/training/${program.id}`}
                className="flex flex-col"
              >
                <span className="text-sm font-medium">{program.title}</span>
                <span className="text-sm text-zinc-500">
                  {program.exercises.length}{' '}
                  {program.exercises.length === 1 ? 'exercise' : 'exercises'}
                </span>
              </Link>
              <form action={archiveTrainingProgram.bind(null, program.id)}>
                <button
                  type="submit"
                  className="flex h-11 items-center justify-center rounded border border-zinc-300 px-3 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:border-zinc-700 dark:hover:text-zinc-100"
                >
                  Archive
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Archived</h2>
          <ul className="flex flex-col gap-2">
            {archived.map((program) => (
              <li
                key={program.id}
                className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <Link
                  href={`/${locale}/training/${program.id}`}
                  className="flex flex-col"
                >
                  <span className="text-sm font-medium text-zinc-500">
                    {program.title}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {program.exercises.length}{' '}
                    {program.exercises.length === 1 ? 'exercise' : 'exercises'}
                  </span>
                </Link>
                <form action={reactivateTrainingProgram.bind(null, program.id)}>
                  <button
                    type="submit"
                    className="flex h-11 items-center justify-center rounded border border-zinc-300 px-3 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:border-zinc-700 dark:hover:text-zinc-100"
                  >
                    Reactivate
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">New program</h2>
        <CreateTrainingProgramForm />
      </section>
    </main>
  );
}
