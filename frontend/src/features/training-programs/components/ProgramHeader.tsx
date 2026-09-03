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

interface ProgramHeaderProps {
  program: TrainingProgram;
  locale: string;
}

export const ProgramHeader = async ({
  program,
  locale,
}: ProgramHeaderProps) => {
  const t = await getTranslations('Training');
  return (
    <div>
      <Link
        href={`/${locale}/training`}
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        &larr; {t('backLink')}
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
                {program.isActive ? t('deactivate') : t('activate')}
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
              {program.isArchived ? t('reactivate') : t('archive')}
            </button>
          </form>
        </div>
      </div>
      {program.isArchived && (
        <p className="mt-1 text-sm text-zinc-500">{t('archivedNote')}</p>
      )}
    </div>
  );
};
