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

// A user's active exclusion targets, grouped by targetType - what
// diets.service.ts (FITNESS-30) filters candidate Food Items against.
// Both preference `type`s (allergy/exclude) are exclusions for
// generation purposes - see knowledge/business-rules.md "Food Preferences
// target structured entities, not free text", which doesn't distinguish
// them for this purpose, only for UI labeling.
export type ExclusionTargets = Record<FoodPreferenceTargetType, Set<string>>;
