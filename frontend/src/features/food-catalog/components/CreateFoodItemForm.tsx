'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createFoodItemSchema,
  type CreateFoodItemInput,
} from '@shared/schemas/food-item';
import type { Macros } from '@shared/types/food';
import { FieldError } from '@shared/ui/components/FieldError';
import {
  createFoodItem,
  type FoodTaxonomy,
} from '@features/food-catalog/actions';

// `satisfies` guards against MACRO_FIELDS drifting out of sync with
// Macros (a typo or a field rename in one would fail here, not silently
// render an unregistered input).
const MACRO_FIELDS = [
  { name: 'caloriesPer100g', label: 'Calories (per 100g)' },
  { name: 'proteinPer100g', label: 'Protein (g per 100g)' },
  { name: 'carbsPer100g', label: 'Carbs (g per 100g)' },
  { name: 'fatPer100g', label: 'Fat (g per 100g)' },
] as const satisfies { name: keyof Macros; label: string }[];

export function CreateFoodItemForm({ taxonomy }: { taxonomy: FoodTaxonomy }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateFoodItemInput>({
    resolver: zodResolver(createFoodItemSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  // Subcategory options are scoped to whichever category is currently
  // selected - the fixed taxonomy makes categoryId -> subcategories a
  // pure lookup, no extra fetch needed.
  const selectedCategoryId = watch('categoryId');
  const subcategories =
    taxonomy.categories.find((c) => c.id === selectedCategoryId)
      ?.subcategories ?? [];

  async function onSubmit(input: CreateFoodItemInput) {
    const result = await createFoodItem(input);
    if (result.error) {
      setError('root', { message: result.error });
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        setError(field as keyof CreateFoodItemInput, { message });
      }
      return;
    }
    reset();
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
        <label htmlFor="categoryId" className="text-sm font-medium">
          Category
        </label>
        <select
          id="categoryId"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('categoryId')}
        >
          <option value="">Select a category</option>
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
          Subcategory
        </label>
        <select
          id="subcategoryId"
          disabled={!selectedCategoryId}
          className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('subcategoryId')}
        >
          <option value="">Select a subcategory</option>
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
          Role
        </label>
        <select
          id="roleId"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('roleId')}
        >
          <option value="">Select a role</option>
          {taxonomy.roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.roleId?.message} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MACRO_FIELDS.map(({ name, label }) => (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={name} className="text-sm font-medium">
              {label}
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
        {isSubmitting ? 'Adding…' : 'Add food item'}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
