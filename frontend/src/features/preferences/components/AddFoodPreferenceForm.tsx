'use client';

import { useEffect, useMemo } from 'react';
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
import type { FoodTaxonomy } from '@features/food-catalog/actions';

export function AddFoodPreferenceForm({
  taxonomy,
}: {
  taxonomy: FoodTaxonomy;
}) {
  const t = useTranslations('Preferences.addFoodForm');
  const tv = useTranslations('Validation');
  const tCategories = useTranslations('FoodCategories');
  const tSubcategories = useTranslations('FoodSubcategories');
  const tRoles = useTranslations('FoodRoles');
  const schema = useMemo(() => createFoodPreferenceSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(schema);

  // Only one of the four targetId selects below is ever mounted at a
  // time - switching targetType must clear a stale selection from the
  // previous branch, or submitting without re-picking would send a
  // targetId that belongs to the wrong table (react-hook-form doesn't
  // clear a field just because the input that registered it unmounted).
  const targetType = watch('targetType');
  useEffect(() => {
    setValue('targetId', '');
  }, [targetType, setValue]);

  const subcategoryOptions = taxonomy.categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({
      id: subcategory.id,
      label: `${tCategories(category.name)} — ${tSubcategories(subcategory.name)}`,
    })),
  );

  async function onSubmit(input: CreateFoodPreferenceInput) {
    const result = await createFoodPreference(input);
    if (!applyFormActionError(setError, result)) reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="label">
          {t('typeLabel')}
        </label>
        <select id="type" className="input" {...register('type')}>
          <option value="">{t('selectTypePlaceholder')}</option>
          <option value="allergy">{t('allergy')}</option>
          <option value="exclude">{t('exclude')}</option>
        </select>
        <FieldError message={errors.type?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="targetType" className="label">
          {t('targetTypeLabel')}
        </label>
        <select id="targetType" className="input" {...register('targetType')}>
          <option value="">{t('selectTargetTypePlaceholder')}</option>
          <option value="category">{t('targetCategory')}</option>
          <option value="subcategory">{t('targetSubcategory')}</option>
          <option value="role">{t('targetRole')}</option>
          <option value="food_item">{t('targetFoodItem')}</option>
        </select>
        <FieldError message={errors.targetType?.message} />
      </div>

      {targetType === 'category' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="targetId" className="label">
            {t('categoryLabel')}
          </label>
          <select id="targetId" className="input" {...register('targetId')}>
            <option value="">{t('selectCategoryPlaceholder')}</option>
            {taxonomy.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {tCategories(category.name)}
              </option>
            ))}
          </select>
          <FieldError message={errors.targetId?.message} />
        </div>
      )}

      {targetType === 'subcategory' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="targetId" className="label">
            {t('subcategoryLabel')}
          </label>
          <select id="targetId" className="input" {...register('targetId')}>
            <option value="">{t('selectSubcategoryPlaceholder')}</option>
            {subcategoryOptions.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.targetId?.message} />
        </div>
      )}

      {targetType === 'role' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="targetId" className="label">
            {t('roleLabel')}
          </label>
          <select id="targetId" className="input" {...register('targetId')}>
            <option value="">{t('selectRolePlaceholder')}</option>
            {taxonomy.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {tRoles(role.name)}
              </option>
            ))}
          </select>
          <FieldError message={errors.targetId?.message} />
        </div>
      )}

      {targetType === 'food_item' && (
        <div className="flex flex-col gap-1">
          <FoodItemPicker id="targetId" field={register('targetId')} />
          <FieldError message={errors.targetId?.message} />
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? t('adding') : t('submit')}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
