// Fixed, ordered set of meal slots - matches db/schema.ts's mealTypeEnum
// exactly. Diet generation always takes the first N of this order for a
// user's configured mealCount (see knowledge/domain-model.md "Diet Item").
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

// The "required Food Role" set per meal referenced by
// knowledge/business-rules.md "Diet menu generation is a greedy
// heuristic" - one role per macro group (protein/carb/vegetable/fat), so
// every meal is a balanced plate rather than e.g. four protein sources.
// Each inner array is a fallback chain within its macro group, tried in
// order until a role has at least one eligible candidate after Food
// Preference exclusion (e.g. lean_protein preferred, falling back to
// fatty_protein then plant_protein).
export const MEAL_ROLE_CHAINS: readonly (readonly string[])[] = [
  ['lean_protein', 'fatty_protein', 'plant_protein'],
  ['complex_carb', 'simple_carb'],
  ['vegetable'],
  ['healthy_fat', 'saturated_fat'],
];

// A Food Item eligible for a given role, already filtered against the
// caller's active Food Preferences (see food-preferences.service.ts's
// getExclusionTargets) - what diets.service.ts hands to the pure
// generateDietItems() heuristic.
export interface FoodCandidate {
  id: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface GeneratedDietItem {
  mealType: MealType;
  foodItemId: string;
  weightGrams: number;
  orderIndex: number;
}

export interface GeneratedDiet {
  items: GeneratedDietItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}
