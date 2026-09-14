// Mirrors backend/src/food-preferences/food-preference.types.ts and
// backend/src/diet-preferences/diet-preference.types.ts.
export const FOOD_PREFERENCE_TYPES = [
  'allergy',
  'exclude',
  'favorite',
] as const;
export type FoodPreferenceType = (typeof FOOD_PREFERENCE_TYPES)[number];

export const FOOD_PREFERENCE_TARGET_TYPES = [
  'category',
  'subcategory',
  'role',
  'food_item',
] as const;
export type FoodPreferenceTargetType =
  (typeof FOOD_PREFERENCE_TARGET_TYPES)[number];

export const DIET_TYPES = ['vegetarian', 'vegan', 'keto', 'paleo'] as const;
export type DietType = (typeof DIET_TYPES)[number];

// Mirrors backend/src/food-preferences/food-preference.mapper.ts's
// FoodPreferenceResponse.
export interface FoodPreference {
  id: string;
  type: FoodPreferenceType;
  targetType: FoodPreferenceTargetType;
  targetId: string;
  targetName: string | null;
  affectsGeneration: boolean;
}

// Mirrors backend/src/diet-preferences/diet-preference.mapper.ts's
// DietPreferenceResponse.
export interface DietPreference {
  id: string;
  dietType: DietType;
}
