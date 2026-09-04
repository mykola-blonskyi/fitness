import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { WorkoutLog } from '@shared/types/workout-log';

interface WorkoutLogListProps {
  workoutLogs: WorkoutLog[];
  locale: string;
}

export const WorkoutLogList = async ({
  workoutLogs,
  locale,
}: WorkoutLogListProps) => {
  const t = await getTranslations('Workouts');
  if (workoutLogs.length === 0) {
    return <p className="text-sm text-muted">{t('noWorkoutsYet')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {workoutLogs.map((log) => (
        <li
          key={log.id}
          className="rounded-ctl border border-line-soft bg-surface-2 px-3 py-2.5"
        >
          <Link
            href={`/${locale}/workouts/${log.id}`}
            className="flex flex-col gap-1"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{log.title}</span>
              <span className="text-sm text-muted">{log.date}</span>
            </span>
            <span className="text-sm text-muted">
              {t('setsLoggedCount', { count: log.sets.length })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
