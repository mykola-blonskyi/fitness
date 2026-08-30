'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch, ApiError } from '@libs/api-client';
import type { WeightUnit } from '@shared/types/user';
import type { CursorPage } from '@shared/types/admin';
import type { FoodItem } from '@features/food-catalog/actions';
import { dietDate } from '@features/diet/date';

// Mirrors backend/src/calorie-targets/calorie-target.mapper.ts's
// CalorieTargetResponse.
export interface CalorieTarget {
  algorithm: {
    code: string;
    name: string;
    description: string;
    formula: string;
  };
  weighIn: {
    weight: number;
    unit: WeightUnit;
    date: string;
  };
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// Mirrors backend/src/diets/diet.mapper.ts's DietItemResponse.
export interface DietItemResponse {
  id: string;
  mealType: string;
  orderIndex: number;
  weightGrams: number;
  foodItem: {
    id: string;
    name: string;
    imageUrl: string | null;
    role: string;
  };
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// Mirrors backend/src/diets/diet.mapper.ts's DietResponse.
export interface DietResponse {
  id: string;
  createdAt: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  algorithm: {
    code: string;
    name: string;
  };
  items: DietItemResponse[];
}

const DIET_PAGE = '/[locale]/diet';

export type GenerateDietResult =
  | { ok: true; diet: DietResponse }
  // preferencesBlocked: generation was rejected because no food items match
  // the user's food/diet preferences (HTTP 422).
  | { ok: false; error: string; preferencesBlocked: boolean };

export type SwapDietItemResult =
  { ok: true; diet: DietResponse } | { ok: false; error: string };

// Used both for the first generate and for a full regenerate - a regenerate
// inserts a new Diet row and drops any swaps.
export async function generateDiet(): Promise<GenerateDietResult> {
  return Sentry.withServerActionInstrumentation(
    'generateDiet',
    {},
    async (): Promise<GenerateDietResult> => {
      try {
        const diet = await apiFetch<DietResponse>(
          `/diets/${dietDate()}/generate`,
          { method: 'POST' },
        );
        revalidatePath(DIET_PAGE, 'page');
        return { ok: true, diet };
      } catch (err) {
        if (err instanceof ApiError) {
          return {
            ok: false,
            error: err.message,
            preferencesBlocked: err.status === 422,
          };
        }
        throw err;
      }
    },
  );
}

export async function swapDietItem(
  dietId: string,
  itemId: string,
  foodItemId?: string,
): Promise<SwapDietItemResult> {
  return Sentry.withServerActionInstrumentation(
    'swapDietItem',
    {},
    async (): Promise<SwapDietItemResult> => {
      try {
        const diet = await apiFetch<DietResponse>(
          `/diets/${dietId}/items/${itemId}/swap`,
          {
            method: 'POST',
            body: JSON.stringify(foodItemId ? { foodItemId } : {}),
          },
        );
        revalidatePath(DIET_PAGE, 'page');
        return { ok: true, diet };
      } catch (err) {
        if (err instanceof ApiError) {
          return { ok: false, error: err.message };
        }
        throw err;
      }
    },
  );
}

export async function listSwapCandidates(
  role: string,
  search?: string,
  locale?: string,
): Promise<FoodItem[]> {
  return Sentry.withServerActionInstrumentation(
    'listSwapCandidates',
    {},
    async () => {
      const query = new URLSearchParams({ role });
      if (search) query.set('search', search);
      if (locale) query.set('locale', locale);
      const page = await apiFetch<CursorPage<FoodItem>>(
        `/food-items?${query.toString()}`,
      );
      return page.items;
    },
  );
}
