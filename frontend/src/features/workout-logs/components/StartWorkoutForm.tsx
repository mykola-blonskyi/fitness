'use client';

import { useTranslations } from 'next-intl';
import {
  startWorkoutLogSchema,
  type StartWorkoutLogInput,
} from '@shared/schemas/workout-log';
import type { TrainingProgram } from '@shared/types/training-program';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { startWorkoutLog } from '@features/workout-logs/actions';

// A successful start redirects to the new Workout Log's detail page (see
// actions.ts) - there's no reset()/success path to handle here, only errors.
export function StartWorkoutForm({
  locale,
  date,
  activePrograms,
}: {
  locale: string;
  date: string;
  activePrograms: TrainingProgram[];
}) {
  const t = useTranslations('Workouts.startForm');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(startWorkoutLogSchema());

  async function onSubmit(input: StartWorkoutLogInput) {
    const result = await startWorkoutLog(locale, date, input);
    if (result) applyFormActionError(setError, result);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-3"
    >
      {activePrograms.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="trainingProgramId" className="label">
            {t('trainingProgramLabel')}
          </label>
          <select
            id="trainingProgramId"
            defaultValue=""
            className="input"
            {...register('trainingProgramId')}
          >
            <option value="">{t('adHoc')}</option>
            {activePrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </select>
          <FieldError message={errors.trainingProgramId?.message} />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="label">
          {t('titleLabel')}
        </label>
        <input
          id="title"
          placeholder={t('titlePlaceholder')}
          className="input"
          {...register('title')}
        />
        <FieldError message={errors.title?.message} />
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? t('starting') : t('submit')}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
