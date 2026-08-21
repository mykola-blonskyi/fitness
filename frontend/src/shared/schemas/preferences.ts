import * as z from 'zod';
import {
  DIET_TYPES,
  FOOD_PREFERENCE_TARGET_TYPES,
  FOOD_PREFERENCE_TYPES,
} from '@shared/types/preferences';

// Mirrors backend/src/food-preferences/dto/create-food-preference.dto.ts
// exactly - kept in sync by hand, not derived from it, same convention
// as shared/schemas/food-item.ts. The backend DTO stays authoritative;
// this is a client-side UX layer only, see docs/decisions.md.
export const createFoodPreferenceSchema = z.object({
  type: z.enum(FOOD_PREFERENCE_TYPES, 'Select a type'),
  targetType: z.enum(FOOD_PREFERENCE_TARGET_TYPES, 'Select what to target'),
  targetId: z.uuid('Choose a target'),
});

export type CreateFoodPreferenceInput = z.infer<
  typeof createFoodPreferenceSchema
>;

// Mirrors backend/src/diet-preferences/dto/create-diet-preference.dto.ts.
export const createDietPreferenceSchema = z.object({
  dietType: z.enum(DIET_TYPES, 'Select a diet type'),
});

export type CreateDietPreferenceInput = z.infer<
  typeof createDietPreferenceSchema
>;
