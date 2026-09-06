import type { FoodPreferenceTargetType } from '@shared/types/preferences';

// Taxonomy names arrive from the API as their raw seeded keys ('lean_meat')
// - unlike Food Item names, the taxonomy tables have no translation rows, so
// the labels live in messages/*.json the same way ExerciseCategories does.
const NAMESPACES: Record<
  Exclude<FoodPreferenceTargetType, 'food_item'>,
  string
> = {
  category: 'FoodCategories',
  subcategory: 'FoodSubcategories',
  role: 'FoodRoles',
};

// A 'food_item' target's name is already localized by the backend against
// the user's stored locale, so it passes through untouched.
export function foodPreferenceTargetLabel(
  targetType: FoodPreferenceTargetType,
  targetName: string,
  t: (key: string) => string,
): string {
  return targetType === 'food_item'
    ? targetName
    : t(`${NAMESPACES[targetType]}.${targetName}`);
}
