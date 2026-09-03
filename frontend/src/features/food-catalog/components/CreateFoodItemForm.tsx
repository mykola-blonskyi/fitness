'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  createFoodItemSchema,
  type CreateFoodItemInput,
} from '@shared/schemas/food-item';
import type { Macros } from '@shared/types/food';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import {
  createFoodItem,
  type FoodTaxonomy,
} from '@features/food-catalog/actions';

// `satisfies` guards against MACRO_FIELDS drifting out of sync with
// Macros (a typo or a field rename in one would fail here, not silently
// render an unregistered input).
const MACRO_FIELDS = [
  { name: 'caloriesPer100g', labelKey: 'caloriesLabel' },
  { name: 'proteinPer100g', labelKey: 'proteinLabel' },
  { name: 'carbsPer100g', labelKey: 'carbsLabel' },
  { name: 'fatPer100g', labelKey: 'fatLabel' },
] as const satisfies { name: keyof Macros; labelKey: string }[];

export function CreateFoodItemForm({ taxonomy }: { taxonomy: FoodTaxonomy }) {
  const t = useTranslations('Food.createForm');
  const tv = useTranslations('Validation');
  const schema = useMemo(() => createFoodItemSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(schema);

  // Subcategory options are scoped to whichever category is currently
  // selected - the fixed taxonomy makes categoryId -> subcategories a
  // pure lookup, no extra fetch needed.
  const selectedCategoryId = watch('categoryId');
  const subcategories =
    taxonomy.categories.find((c) => c.id === selectedCategoryId)
      ?.subcategories ?? [];

  async function onSubmit(input: CreateFoodItemInput) {
    const result = await createFoodItem(input);
    if (!applyFormActionError(setError, result)) reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          {t('nameLabel')}
        </label>
        <input
          id="name"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('name')}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="categoryId" className="text-sm font-medium">
          {t('categoryLabel')}
        </label>
        <select
          id="categoryId"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('categoryId')}
        >
          <option value="">{t('selectCategoryPlaceholder')}</option>
          {taxonomy.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.categoryId?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="subcategoryId" className="text-sm font-medium">
          {t('subcategoryLabel')}
        </label>
        <select
          id="subcategoryId"
          disabled={!selectedCategoryId}
          className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('subcategoryId')}
        >
          <option value="">{t('selectSubcategoryPlaceholder')}</option>
          {subcategories.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.subcategoryId?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="roleId" className="text-sm font-medium">
          {t('roleLabel')}
        </label>
        <select
          id="roleId"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('roleId')}
        >
          <option value="">{t('selectRolePlaceholder')}</option>
          {taxonomy.roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.roleId?.message} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MACRO_FIELDS.map(({ name, labelKey }) => (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={name} className="text-sm font-medium">
              {t(labelKey)}
            </label>
            <input
              id={name}
              type="number"
              step="0.1"
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              {...register(name, { valueAsNumber: true })}
            />
            <FieldError message={errors[name]?.message} />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? t('adding') : t('submit')}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
