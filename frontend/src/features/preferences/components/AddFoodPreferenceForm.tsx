'use client';

import { useEffect, useState } from 'react';
import {
  createFoodPreferenceSchema,
  type CreateFoodPreferenceInput,
} from '@shared/schemas/preferences';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { createFoodPreference } from '@features/preferences/actions';
import type { FoodTaxonomy } from '@features/food-catalog/actions';

export function AddFoodPreferenceForm({
  taxonomy,
  foodItems,
}: {
  taxonomy: FoodTaxonomy;
  foodItems: { id: string; name: string }[];
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(createFoodPreferenceSchema);

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
      label: `${category.name} — ${subcategory.name}`,
    })),
  );

  // A plain <select> over the full catalog doesn't scale as it grows
  // (see knowledge/business-rules.md - the seed is expected to grow via
  // manual re-runs) - this filters the already-fetched list client-side
  // rather than adding a new search endpoint, capped so a broad query
  // still renders a short list.
  const [foodItemSearch, setFoodItemSearch] = useState('');
  const filteredFoodItems = foodItemSearch
    ? foodItems
        .filter((item) =>
          item.name.toLowerCase().includes(foodItemSearch.toLowerCase()),
        )
        .slice(0, 50)
    : foodItems.slice(0, 50);

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
        <label htmlFor="type" className="text-sm font-medium">
          Type
        </label>
        <select
          id="type"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('type')}
        >
          <option value="">Select a type</option>
          <option value="allergy">Allergy</option>
          <option value="exclude">Exclude</option>
        </select>
        <FieldError message={errors.type?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="targetType" className="text-sm font-medium">
          Applies to
        </label>
        <select
          id="targetType"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('targetType')}
        >
          <option value="">Select what to target</option>
          <option value="category">A whole category</option>
          <option value="subcategory">A subcategory</option>
          <option value="role">A role</option>
          <option value="food_item">A specific food item</option>
        </select>
        <FieldError message={errors.targetType?.message} />
      </div>

      {targetType === 'category' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="targetId" className="text-sm font-medium">
            Category
          </label>
          <select
            id="targetId"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            {...register('targetId')}
          >
            <option value="">Select a category</option>
            {taxonomy.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.targetId?.message} />
        </div>
      )}

      {targetType === 'subcategory' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="targetId" className="text-sm font-medium">
            Subcategory
          </label>
          <select
            id="targetId"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            {...register('targetId')}
          >
            <option value="">Select a subcategory</option>
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
          <label htmlFor="targetId" className="text-sm font-medium">
            Role
          </label>
          <select
            id="targetId"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            {...register('targetId')}
          >
            <option value="">Select a role</option>
            {taxonomy.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.targetId?.message} />
        </div>
      )}

      {targetType === 'food_item' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="foodItemSearch" className="text-sm font-medium">
            Search food items
          </label>
          <input
            id="foodItemSearch"
            type="search"
            value={foodItemSearch}
            onChange={(e) => setFoodItemSearch(e.target.value)}
            placeholder="Food name…"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <label htmlFor="targetId" className="text-sm font-medium">
            Food item
          </label>
          <select
            id="targetId"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            {...register('targetId')}
          >
            <option value="">Select a food item</option>
            {filteredFoodItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.targetId?.message} />
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Adding…' : 'Add preference'}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
