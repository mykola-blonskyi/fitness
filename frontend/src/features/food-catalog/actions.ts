'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@libs/api-client';
import {
  createFoodItemSchema,
  type CreateFoodItemInput,
} from '@shared/schemas/food-item';
import type { Macros } from '@shared/types/food';
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

export async function createFoodItem(
  input: CreateFoodItemInput,
): Promise<CreateFoodItemFormState> {
  // No `formData` option - see features/onboarding/actions.ts for why.
  return submitFormAction({
    name: 'createFoodItem',
    schema: createFoodItemSchema,
    input,
    errorMessage: "Couldn't add that food item — try again.",
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
