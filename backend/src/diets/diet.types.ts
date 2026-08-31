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

export interface MealSlot {
  mealType: MealType;
  // 1-based, per mealType - a slot's 2nd occurrence of 'breakfast' in a
  // day is {mealType: 'breakfast', occurrence: 2}, distinct from the
  // first. See ADR-015.
  occurrence: number;
}

// mealCount can exceed MEAL_TYPES.length (ADR-015) - once it does, this
// round-robins through MEAL_TYPES again rather than inventing a 5th meal
// type, so every slot still has a real name (e.g. "second lunch", not
// "meal 5").
export function mealSlotsForCount(mealCount: number): MealSlot[] {
  const occurrenceByType: Record<MealType, number> = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  };
  const slots: MealSlot[] = [];
  for (let i = 0; i < mealCount; i++) {
    const mealType = MEAL_TYPES[i % MEAL_TYPES.length];
    occurrenceByType[mealType] += 1;
    slots.push({ mealType, occurrence: occurrenceByType[mealType] });
  }
  return slots;
}

export interface FoodCandidate {
  id: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface GeneratedDietItem {
  mealType: MealType;
  mealOccurrence: number;
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
