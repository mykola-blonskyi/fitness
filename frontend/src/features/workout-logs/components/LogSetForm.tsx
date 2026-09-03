'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  logWorkoutSetSchema,
  type LogWorkoutSetInput,
} from '@shared/schemas/workout-log';
import type { Exercise } from '@shared/types/exercise';
import { WEIGHT_UNITS, type WeightUnit } from '@shared/types/user';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { useLastWeightUnit } from '@shared/libs/use-last-weight-unit';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { syncedLogWorkoutSet } from '@features/workout-logs/offline';

// Renders only the value fields for the selected exercise's category
// (cardio -> duration, else weight/reps); the backend re-validates
// regardless of what the client sends - mirrors
// training-programs/components/AddProgramExerciseForm.tsx.
export function LogSetForm({
  workoutLogId,
  exercises,
  defaultWeightUnit,
}: {
  workoutLogId: string;
  exercises: Exercise[];
  defaultWeightUnit: WeightUnit;
}) {
  const [queued, setQueued] = useState(false);
  const [rememberedUnit, rememberUnit] = useLastWeightUnit(defaultWeightUnit);
  const tv = useTranslations('Validation');
  const schema = useMemo(() => logWorkoutSetSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(schema, {
    defaultValues: { unit: rememberedUnit },
  });
  const unitField = register('unit');

  const selectedExerciseId = watch('exerciseId');
  const selectedExercise = exercises.find(
    (exercise) => exercise.id === selectedExerciseId,
  );
  const isCardio = selectedExercise?.category === 'cardio';

  async function onSubmit(input: LogWorkoutSetInput) {
    setQueued(false);
    const outcome = await syncedLogWorkoutSet({
      workoutLogId,
      input: {
        exerciseId: input.exerciseId,
        ...(isCardio
          ? { durationSeconds: input.durationSeconds }
          : { weight: input.weight, unit: input.unit, reps: input.reps }),
      },
    });
    // Unlike WeightForm (one value per day), sets are logged back-to-back -
    // clear the form but keep the unit selection for the next set.
    if (outcome.queued) {
      setQueued(true);
      reset({ unit: rememberedUnit });
      return;
    }
    if (!applyFormActionError(setError, outcome.result)) {
      reset({ unit: rememberedUnit });
    }
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
                Weight
              </label>
              <div className="flex gap-2">
                <input
                  id="weight"
                  type="number"
                  step="any"
                  className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  {...register('weight', { valueAsNumber: true })}
                />
                <select
                  id="unit"
                  aria-label="Weight unit"
                  className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  {...unitField}
                  onChange={(e) => {
                    unitField.onChange(e);
                    rememberUnit(e.target.value as WeightUnit);
                  }}
                >
                  {WEIGHT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
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

      {queued && (
        <p className="text-sm text-zinc-500" role="status">
          Saved offline — will sync automatically once you&apos;re back online.
        </p>
      )}
    </form>
  );
}
