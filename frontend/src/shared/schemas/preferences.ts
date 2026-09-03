import * as z from 'zod';
import {
  DIET_TYPES,
  FOOD_PREFERENCE_TARGET_TYPES,
  FOOD_PREFERENCE_TYPES,
} from '@shared/types/preferences';
import type { ValidationTranslator } from '@shared/schemas/validation-translator';

// Mirrors backend/src/food-preferences/dto/create-food-preference.dto.ts
// exactly - kept in sync by hand, not derived from it, same convention
// as shared/schemas/food-item.ts. The backend DTO stays authoritative;
// this is a client-side UX layer only, see docs/decisions.md.
export function createFoodPreferenceSchema(t: ValidationTranslator) {
  return z.object({
    type: z.enum(FOOD_PREFERENCE_TYPES, t('foodPreference.typeRequired')),
    targetType: z.enum(
      FOOD_PREFERENCE_TARGET_TYPES,
      t('foodPreference.targetTypeRequired'),
    ),
    targetId: z.uuid(t('foodPreference.targetRequired')),
  });
}

export type CreateFoodPreferenceInput = z.infer<
  ReturnType<typeof createFoodPreferenceSchema>
>;

// Mirrors backend/src/diet-preferences/dto/create-diet-preference.dto.ts.
export function createDietPreferenceSchema(t: ValidationTranslator) {
  return z.object({
    dietType: z.enum(DIET_TYPES, t('dietPreference.dietTypeRequired')),
  });
}

export type CreateDietPreferenceInput = z.infer<
  ReturnType<typeof createDietPreferenceSchema>
>;
