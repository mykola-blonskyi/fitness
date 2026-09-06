'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@libs/api-client';
import {
  createFoodItemSchema,
  type CreateFoodItemInput,
} from '@shared/schemas/food-item';
import type { Macros } from '@shared/types/food';
import type { CursorPage } from '@shared/types/admin';
import {
  submitFormAction,
  type FormActionError,
} from '@shared/libs/form-action';

// Mirrors backend/src/food-items/food-item.mapper.ts's FoodItemResponse.
export interface FoodItem extends Macros {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  role: string;
  isVerified: boolean;
  imageUrl: string | null;
}

// Mirrors backend/src/food-items/food-item.mapper.ts's TaxonomyResponse.
export interface FoodTaxonomy {
  categories: {
    id: string;
    name: string;
    subcategories: { id: string; name: string }[];
  }[];
  roles: { id: string; name: string }[];
}

export type CreateFoodItemFormState = FormActionError<CreateFoodItemInput>;

export async function listFoodItems(params: {
  category?: string;
  search?: string;
  cursor?: string;
}): Promise<CursorPage<FoodItem>> {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.cursor) query.set('cursor', params.cursor);
  return apiFetch<CursorPage<FoodItem>>(`/food-items?${query.toString()}`);
}

export async function createFoodItem(
  input: CreateFoodItemInput,
): Promise<CreateFoodItemFormState> {
  const [tv, t] = await Promise.all([
    getTranslations('Validation'),
    getTranslations('Food.errors'),
  ]);
  // No `formData` option - see features/onboarding/actions.ts for why.
  return submitFormAction({
    name: 'createFoodItem',
    schema: createFoodItemSchema(tv),
    input,
    errorMessage: t('addFailed'),
    async mutate(parsed) {
      await apiFetch<FoodItem>('/food-items', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      revalidatePath('/[locale]/food', 'page');
      return {};
    },
  });
}
