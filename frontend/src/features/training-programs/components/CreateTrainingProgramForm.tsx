'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  createTrainingProgramSchema,
  type CreateTrainingProgramInput,
} from '@shared/schemas/training-program';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { createTrainingProgram } from '@features/training-programs/actions';

export function CreateTrainingProgramForm() {
  const t = useTranslations('Training.createForm');
  const tv = useTranslations('Validation');
  const schema = useMemo(() => createTrainingProgramSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(schema);

  async function onSubmit(input: CreateTrainingProgramInput) {
    const result = await createTrainingProgram(input);
    if (!applyFormActionError(setError, result)) reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-3"
    >
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
        {isSubmitting ? t('creating') : t('submit')}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
