import { EXERCISE_CATEGORY_LABELS } from '@shared/types/exercise';
import type { ProgramExercise } from '@shared/types/training-program';
import {
  moveProgramExercise,
  removeProgramExercise,
} from '@features/training-programs/actions';

// Server component using plain <form action> bindings, no client JS -
// same convention as settings/preferences and daily-log's clearWeight.
// Buttons meet the 44px touch-target minimum with 8px+ gaps.
export function ProgramExerciseRow({
  programId,
  exercise,
  isFirst,
  isLast,
  disabled,
}: {
  programId: string;
  exercise: ProgramExercise;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
}) {
  const target =
    exercise.exerciseCategory === 'cardio'
      ? `${exercise.targetDurationSeconds ?? '—'}s`
      : `${exercise.targetSets ?? '—'} × ${exercise.targetReps ?? '—'}`;

  return (
    <li className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{exercise.exerciseName}</span>
        <span className="text-sm text-zinc-500">
          {EXERCISE_CATEGORY_LABELS[exercise.exerciseCategory]} &middot;{' '}
          {target}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <form
          action={moveProgramExercise.bind(null, programId, exercise.id, 'up')}
        >
          <button
            type="submit"
            disabled={disabled || isFirst}
            aria-label={`Move ${exercise.exerciseName} up`}
            className="flex size-11 items-center justify-center rounded border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            &uarr;
          </button>
        </form>
        <form
          action={moveProgramExercise.bind(
            null,
            programId,
            exercise.id,
            'down',
          )}
        >
          <button
            type="submit"
            disabled={disabled || isLast}
            aria-label={`Move ${exercise.exerciseName} down`}
            className="flex size-11 items-center justify-center rounded border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            &darr;
          </button>
        </form>
        <form action={removeProgramExercise.bind(null, programId, exercise.id)}>
          <button
            type="submit"
            disabled={disabled}
            aria-label={`Remove ${exercise.exerciseName}`}
            className="flex h-11 items-center justify-center rounded border border-zinc-300 px-3 text-sm text-zinc-500 transition-colors hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:hover:text-zinc-100"
          >
            Remove
          </button>
        </form>
      </div>
    </li>
  );
}
