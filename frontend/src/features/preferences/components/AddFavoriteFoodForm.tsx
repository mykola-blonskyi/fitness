'use client';

import { useState } from 'react';
import {
  createFoodPreferenceSchema,
  type CreateFoodPreferenceInput,
} from '@shared/schemas/preferences';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { createFoodPreference } from '@features/preferences/actions';

export function AddFavoriteFoodForm({
  foodItems,
}: {
  foodItems: { id: string; name: string }[];
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm<CreateFoodPreferenceInput>(createFoodPreferenceSchema, {
    defaultValues: { type: 'favorite', targetType: 'food_item', targetId: '' },
  });

  const [foodItemSearch, setFoodItemSearch] = useState('');
  const filteredFoodItems = foodItemSearch
    ? foodItems
        .filter((item) =>
          item.name.toLowerCase().includes(foodItemSearch.toLowerCase()),
        )
        .slice(0, 50)
    : foodItems.slice(0, 50);

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
        <label htmlFor="favoriteFoodItemSearch" className="text-sm font-medium">
          Search food items
        </label>
        <input
          id="favoriteFoodItemSearch"
          type="search"
          value={foodItemSearch}
          onChange={(e) => setFoodItemSearch(e.target.value)}
          placeholder="Food name…"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <label htmlFor="favoriteTargetId" className="text-sm font-medium">
          Food item
        </label>
        <select
          id="favoriteTargetId"
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Adding…' : 'Add favorite'}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
