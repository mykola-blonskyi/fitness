import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  AddProgramExerciseForm,
  ProgramExerciseRow,
  ProgramHeader,
} from '@features/training-programs';
import type { Exercise } from '@shared/types/exercise';
import type { TrainingProgram } from '@shared/types/training-program';
import type { CursorPage } from '@shared/types/admin';
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

  // /exercises is cursor-paginated (FITNESS-43); this picker isn't
  // search-driven like the catalog page, so grab the largest page the
  // backend allows rather than only the default-sized first page.
  const exercisePage = await apiFetch<CursorPage<Exercise>>(
    '/exercises?limit=100',
  );
  const exercises = exercisePage.items;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <ProgramHeader program={program} locale={locale} />

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        {program.exercises.length === 0 && (
          <p className="text-sm text-muted">{t('noExercisesYet')}</p>
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
        <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
          <h2 className="text-[15px] font-bold">{t('addExerciseHeading')}</h2>
          <AddProgramExerciseForm
            programId={program.id}
            exercises={exercises}
          />
        </section>
      )}
    </main>
  );
}
