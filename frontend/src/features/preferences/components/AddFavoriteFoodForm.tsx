'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  createFoodPreferenceSchema,
  type CreateFoodPreferenceInput,
} from '@shared/schemas/preferences';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { createFoodPreference } from '@features/preferences/actions';
import { FoodItemPicker } from '@features/preferences/components/FoodItemPicker';

export function AddFavoriteFoodForm() {
  const t = useTranslations('Preferences.addFavoriteForm');
  const tv = useTranslations('Validation');
  const schema = useMemo(() => createFoodPreferenceSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm<CreateFoodPreferenceInput>(schema, {
    defaultValues: { type: 'favorite', targetType: 'food_item', targetId: '' },
  });

  async function onSubmit(input: CreateFoodPreferenceInput) {
    const result = await createFoodPreference({
      ...input,
      type: 'favorite',
      targetType: 'food_item',
    });
    if (!applyFormActionError(setError, result)) reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <FoodItemPicker id="favoriteTargetId" field={register('targetId')} />
        <FieldError message={errors.targetId?.message} />
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? t('adding') : t('submit')}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
