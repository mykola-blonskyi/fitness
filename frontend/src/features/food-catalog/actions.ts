'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch } from '@libs/api-client';
import {
  createFoodItemSchema,
  type CreateFoodItemInput,
} from '@shared/schemas/food-item';
import { firstFieldErrors } from '@shared/schemas/zod-errors';

// Mirrors backend/src/food-items/food-item.mapper.ts's FoodItemResponse.
export interface FoodItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  role: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  isVerified: boolean;
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

export interface CreateFoodItemFormState {
  error?: string;
  fieldErrors?: Partial<Record<keyof CreateFoodItemInput, string>>;
}

export async function createFoodItem(
  input: CreateFoodItemInput,
): Promise<CreateFoodItemFormState> {
  // No `formData` option - see features/onboarding/actions.ts for why.
  return Sentry.withServerActionInstrumentation(
    'createFoodItem',
    {},
    async () => {
      // react-hook-form's own zodResolver already validated client-side -
      // this is a defensive re-check, not the primary gate.
      const parsed = createFoodItemSchema.safeParse(input);
      if (!parsed.success) {
        return { fieldErrors: firstFieldErrors(parsed.error) };
      }

      try {
        await apiFetch<FoodItem>('/food-items', {
          method: 'POST',
          body: JSON.stringify(parsed.data),
        });
      } catch {
        return { error: "Couldn't add that food item — try again." };
      }

      revalidatePath('/[locale]/food', 'page');
      return {};
    },
  );
}
