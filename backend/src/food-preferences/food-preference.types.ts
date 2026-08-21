// Kept in one place because the DTO, mapper, and service's per-target
// table lookup all need the exact same two lists in sync — see
// knowledge/domain-model.md "Food Preference".
export const FOOD_PREFERENCE_TYPES = ['allergy', 'exclude'] as const;
export type FoodPreferenceType = (typeof FOOD_PREFERENCE_TYPES)[number];

export const FOOD_PREFERENCE_TARGET_TYPES = [
  'category',
  'subcategory',
  'role',
  'food_item',
] as const;
export type FoodPreferenceTargetType =
  (typeof FOOD_PREFERENCE_TARGET_TYPES)[number];
