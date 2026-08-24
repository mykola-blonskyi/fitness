'use client';

import {
  addProgramExerciseSchema,
  type AddProgramExerciseInput,
} from '@shared/schemas/training-program';
import type { Exercise } from '@shared/types/exercise';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { addProgramExercise } from '@features/training-programs/actions';

// Renders only the target fields for the selected exercise's category
// (cardio -> duration, else sets/reps); the backend re-validates
// regardless of what the client sends.
export function AddProgramExerciseForm({
  programId,
  exercises,
}: {
  programId: string;
  exercises: Exercise[];
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(addProgramExerciseSchema);

  const selectedExerciseId = watch('exerciseId');
  const selectedExercise = exercises.find(
    (exercise) => exercise.id === selectedExerciseId,
  );
  const isCardio = selectedExercise?.category === 'cardio';

  async function onSubmit(input: AddProgramExerciseInput) {
    const result = await addProgramExercise(programId, {
      exerciseId: input.exerciseId,
      ...(isCardio
        ? { targetDurationSeconds: input.targetDurationSeconds }
        : { targetSets: input.targetSets, targetReps: input.targetReps }),
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
            <label
              htmlFor="targetDurationSeconds"
              className="text-sm font-medium"
            >
              Target duration (seconds)
            </label>
            <input
              id="targetDurationSeconds"
              type="number"
              min={1}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              {...register('targetDurationSeconds', { valueAsNumber: true })}
            />
            <FieldError message={errors.targetDurationSeconds?.message} />
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="targetSets" className="text-sm font-medium">
                Target sets
              </label>
              <input
                id="targetSets"
                type="number"
                min={1}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                {...register('targetSets', { valueAsNumber: true })}
              />
              <FieldError message={errors.targetSets?.message} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="targetReps" className="text-sm font-medium">
                Target reps
              </label>
              <input
                id="targetReps"
                type="number"
                min={1}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                {...register('targetReps', { valueAsNumber: true })}
              />
              <FieldError message={errors.targetReps?.message} />
            </div>
          </div>
        ))}

      <button
        type="submit"
        disabled={isSubmitting || !selectedExercise}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Adding…' : 'Add exercise'}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
