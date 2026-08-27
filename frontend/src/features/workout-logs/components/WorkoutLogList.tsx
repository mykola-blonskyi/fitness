import Link from 'next/link';
import type { WorkoutLog } from '@shared/types/workout-log';

interface WorkoutLogListProps {
  workoutLogs: WorkoutLog[];
  locale: string;
}

export const WorkoutLogList = ({
  workoutLogs,
  locale,
}: WorkoutLogListProps) => {
  if (workoutLogs.length === 0) {
    return <p className="text-sm text-zinc-500">No workouts logged yet.</p>;
  }

  return (
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
              {log.sets.length} {log.sets.length === 1 ? 'set' : 'sets'} logged
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
