'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createDietPreferenceSchema,
  type CreateDietPreferenceInput,
} from '@shared/schemas/preferences';
import {
  DIET_TYPES,
  DIET_TYPE_LABELS,
  type DietType,
} from '@shared/types/preferences';
import { FieldError } from '@shared/ui/components/FieldError';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { createDietPreference } from '@features/preferences/actions';

export function AddDietPreferenceForm({
  alreadySelected,
}: {
  alreadySelected: DietType[];
}) {
  const tv = useTranslations('Validation');
  const schema = useMemo(() => createDietPreferenceSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateDietPreferenceInput>({
    resolver: zodResolver(schema),
  });

  const options = DIET_TYPES.filter(
    (dietType) => !alreadySelected.includes(dietType),
  );

  async function onSubmit(input: CreateDietPreferenceInput) {
    const result = await createDietPreference(input);
    if (!applyFormActionError(setError, result)) reset();
  }

  if (options.length === 0) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="dietType" className="text-sm font-medium">
          Diet type
        </label>
        <select
          id="dietType"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('dietType')}
        >
          <option value="">Select a diet type</option>
          {options.map((dietType) => (
            <option key={dietType} value={dietType}>
              {DIET_TYPE_LABELS[dietType]}
            </option>
          ))}
        </select>
        <FieldError message={errors.dietType?.message} />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Adding…' : 'Add'}
      </button>
      <FieldError message={errors.root?.message} />
    </form>
  );
}
