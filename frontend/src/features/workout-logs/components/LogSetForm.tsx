'use client';

import {
  logWorkoutSetSchema,
  type LogWorkoutSetInput,
} from '@shared/schemas/workout-log';
import type { Exercise } from '@shared/types/exercise';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { logWorkoutSet } from '@features/workout-logs/actions';

// Renders only the value fields for the selected exercise's category
// (cardio -> duration, else weight/reps); the backend re-validates
// regardless of what the client sends - mirrors
// training-programs/components/AddProgramExerciseForm.tsx.
export function LogSetForm({
  workoutLogId,
  exercises,
}: {
  workoutLogId: string;
  exercises: Exercise[];
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(logWorkoutSetSchema);

  const selectedExerciseId = watch('exerciseId');
  const selectedExercise = exercises.find(
    (exercise) => exercise.id === selectedExerciseId,
  );
  const isCardio = selectedExercise?.category === 'cardio';

  async function onSubmit(input: LogWorkoutSetInput) {
    const result = await logWorkoutSet(workoutLogId, {
      exerciseId: input.exerciseId,
      ...(isCardio
        ? { durationSeconds: input.durationSeconds }
        : { weight: input.weight, reps: input.reps }),
    });
    if (!applyFormActionError(setError, result)) reset();
  }

  if (exercises.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No exercises in the catalog yet — add one on the Exercises page first.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="exerciseId" className="text-sm font-medium">
          Exercise
        </label>
        <select
          id="exerciseId"
          defaultValue=""
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('exerciseId')}
        >
          <option value="" disabled>
            Select an exercise
          </option>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.exerciseId?.message} />
      </div>

      {selectedExercise &&
        (isCardio ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="durationSeconds" className="text-sm font-medium">
              Duration (seconds)
            </label>
            <input
              id="durationSeconds"
              type="number"
              min={1}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              {...register('durationSeconds', { valueAsNumber: true })}
            />
            <FieldError message={errors.durationSeconds?.message} />
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="weight" className="text-sm font-medium">
                Weight (kg)
              </label>
              <input
                id="weight"
                type="number"
                step="0.5"
                min={0.1}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                {...register('weight', { valueAsNumber: true })}
              />
              <FieldError message={errors.weight?.message} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="reps" className="text-sm font-medium">
                Reps
              </label>
              <input
                id="reps"
                type="number"
                min={1}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                {...register('reps', { valueAsNumber: true })}
              />
              <FieldError message={errors.reps?.message} />
            </div>
          </div>
        ))}

      <button
        type="submit"
        disabled={isSubmitting || !selectedExercise}
        className="bg-foreground text-background flex h-11 items-center justify-center rounded px-4 disabled:opacity-50"
      >
        {isSubmitting ? 'Logging…' : 'Log set'}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
