import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ActiveBadge } from '@features/training-programs/components/ActiveBadge';
import {
  activateTrainingProgram,
  archiveTrainingProgram,
  deactivateTrainingProgram,
  reactivateTrainingProgram,
} from '@features/training-programs/actions';
import type { TrainingProgram } from '@shared/types/training-program';

interface TrainingProgramListProps {
  programs: TrainingProgram[];
  locale: string;
}

// isActive is surfaced per-row (badge + toggle) rather than as its own
// section - a dedicated "currently active" summary would just repeat a
// subset of this same list.
export const TrainingProgramList = async ({
  programs,
  locale,
}: TrainingProgramListProps) => {
  const t = await getTranslations('Training');
  const unarchived = programs.filter((program) => !program.isArchived);
  const archived = programs.filter((program) => program.isArchived);

  return (
    <>
      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('programsHeading')}</h2>
        {unarchived.length === 0 && (
          <p className="text-sm text-muted">{t('noPrograms')}</p>
        )}
        <ul className="flex flex-col gap-2">
          {unarchived.map((program) => (
            <li
              key={program.id}
              className="flex items-center justify-between gap-3 rounded-ctl border border-line-soft bg-surface-2 px-3 py-2.5"
            >
              <Link
                href={`/${locale}/training/${program.id}`}
                className="flex flex-col gap-1"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium">{program.title}</span>
                  {program.isActive && <ActiveBadge />}
                </span>
                <span className="text-sm text-muted">
                  {t('exerciseCount', { count: program.exercises.length })}
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <form
                  action={(program.isActive
                    ? deactivateTrainingProgram
                    : activateTrainingProgram
                  ).bind(null, program.id)}
                >
                  <button type="submit" className="btn-ghost">
                    {program.isActive ? t('deactivate') : t('activate')}
                  </button>
                </form>
                <form action={archiveTrainingProgram.bind(null, program.id)}>
                  <button type="submit" className="btn-ghost">
                    {t('archive')}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {archived.length > 0 && (
        <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
          <h2 className="text-[15px] font-bold">{t('archivedHeading')}</h2>
          <ul className="flex flex-col gap-2">
            {archived.map((program) => (
              <li
                key={program.id}
                className="flex items-center justify-between gap-3 rounded-ctl border border-line-soft bg-surface-2 px-3 py-2.5"
              >
                <Link
                  href={`/${locale}/training/${program.id}`}
                  className="flex flex-col"
                >
                  <span className="text-sm font-medium text-muted">
                    {program.title}
                  </span>
                  <span className="text-sm text-muted">
                    {program.exercises.length}{' '}
                    {program.exercises.length === 1 ? 'exercise' : 'exercises'}
                  </span>
                </Link>
                <form action={reactivateTrainingProgram.bind(null, program.id)}>
                  <button type="submit" className="btn-ghost">
                    {t('reactivate')}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
};
