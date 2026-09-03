'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  createExerciseSchema,
  type CreateExerciseInput,
} from '@shared/schemas/exercise';
import {
  EXERCISE_CATEGORIES,
  EXERCISE_CATEGORY_LABELS,
} from '@shared/types/exercise';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { createExercise } from '@features/exercise-catalog/actions';

export function CreateExerciseForm() {
  const router = useRouter();
  const tv = useTranslations('Validation');
  const schema = useMemo(() => createExerciseSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(schema);

  async function onSubmit(input: CreateExerciseInput) {
    const result = await createExercise(input);
    if (applyFormActionError(setError, result)) return;
    reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('name')}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          defaultValue=""
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('category')}
        >
          <option value="" disabled>
            Select a category
          </option>
          {EXERCISE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {EXERCISE_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        <FieldError message={errors.category?.message} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Adding…' : 'Add exercise'}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
