import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  AddProgramExerciseForm,
  ProgramExerciseRow,
  ProgramHeader,
} from '@features/training-programs';
import type { Exercise } from '@shared/types/exercise';
import type { TrainingProgram } from '@shared/types/training-program';
import { apiFetch, ApiError } from '@libs/api-client';

export default async function TrainingProgramDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('Training');

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
      <ProgramHeader program={program} locale={locale} />

      <section className="flex flex-col gap-2">
        {program.exercises.length === 0 && (
          <p className="text-sm text-zinc-500">{t('noExercisesYet')}</p>
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
          <h2 className="text-lg font-semibold">{t('addExerciseHeading')}</h2>
          <AddProgramExerciseForm
            programId={program.id}
            exercises={exercises}
          />
        </section>
      )}
    </main>
  );
}
