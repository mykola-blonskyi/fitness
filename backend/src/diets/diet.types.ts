// Diet generation always takes the first N of this order for a user's
// configured mealCount.
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

// One role per macro group (protein/carb/vegetable/fat) so every meal is a
// balanced plate. Each inner array is a fallback chain, tried in order until
// a role has an eligible candidate after Food Preference exclusion.
export const MEAL_ROLE_CHAINS: readonly (readonly string[])[] = [
  ['lean_protein', 'fatty_protein', 'plant_protein'],
  ['complex_carb', 'simple_carb'],
  ['vegetable'],
  ['healthy_fat', 'saturated_fat'],
];

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
