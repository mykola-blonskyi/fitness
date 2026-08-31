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

// allergy/exclude are treated as exclusions for generation purposes -
// they only differ for UI labeling. favorite is the opposite polarity
// (FoodPreferencesService.getExclusionTargets excludes it from this set;
// see getFavoriteFoodItemIds instead).
export type ExclusionTargets = Record<FoodPreferenceTargetType, Set<string>>;
