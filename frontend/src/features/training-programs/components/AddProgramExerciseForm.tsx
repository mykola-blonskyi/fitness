'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  addProgramExerciseSchema,
  type AddProgramExerciseInput,
} from '@shared/schemas/training-program';
import type { Exercise } from '@shared/types/exercise';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { addProgramExercise } from '@features/training-programs/actions';
import { ExercisePicker } from '@features/exercise-catalog/components/ExercisePicker';

// Renders only the target fields for the selected exercise's category
// (cardio -> duration, else sets/reps); the backend re-validates
// regardless of what the client sends.
export function AddProgramExerciseForm({ programId }: { programId: string }) {
  const t = useTranslations('Training.addExerciseForm');
  const tv = useTranslations('Validation');
  const schema = useMemo(() => addProgramExerciseSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(schema);

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const isCardio = selectedExercise?.category === 'cardio';

  function onExerciseSelect(exercise: Exercise) {
    setSelectedExercise(exercise);
    setValue('exerciseId', exercise.id, { shouldValidate: true });
  }

  async function onSubmit(input: AddProgramExerciseInput) {
    const result = await addProgramExercise(programId, {
      exerciseId: input.exerciseId,
      ...(isCardio
        ? { targetDurationSeconds: input.targetDurationSeconds }
        : { targetSets: input.targetSets, targetReps: input.targetReps }),
    });
    if (!applyFormActionError(setError, result)) {
      reset();
      setSelectedExercise(null);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-3"
    >
      <ExercisePicker
        id="exerciseId"
        selectedExercise={selectedExercise}
        onSelect={onExerciseSelect}
      />
      <FieldError message={errors.exerciseId?.message} />

      {selectedExercise &&
        (isCardio ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="targetDurationSeconds" className="label">
              {t('targetDurationLabel')}
            </label>
            <input
              id="targetDurationSeconds"
              type="number"
              min={1}
              className="input"
              {...register('targetDurationSeconds', { valueAsNumber: true })}
            />
            <FieldError message={errors.targetDurationSeconds?.message} />
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="targetSets" className="label">
                {t('targetSetsLabel')}
              </label>
              <input
                id="targetSets"
                type="number"
                min={1}
                className="input"
                {...register('targetSets', { valueAsNumber: true })}
              />
              <FieldError message={errors.targetSets?.message} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="targetReps" className="label">
                {t('targetRepsLabel')}
              </label>
              <input
                id="targetReps"
                type="number"
                min={1}
                className="input"
                {...register('targetReps', { valueAsNumber: true })}
              />
              <FieldError message={errors.targetReps?.message} />
            </div>
          </div>
        ))}

      <button
        type="submit"
        disabled={isSubmitting || !selectedExercise}
        className="btn-primary"
      >
        {isSubmitting ? t('adding') : t('submit')}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
