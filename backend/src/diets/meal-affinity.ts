import { isFoodFamily, type FoodFamily } from '../food-items/food-item.types';

export type MealAffinity = 'last_meal';

// Per Family, not per Food Item: no user can be asked to tag their cottage
// cheese, and every casein dairy belongs at the end of the day anyway.
const MEAL_AFFINITY: Partial<Record<FoodFamily, MealAffinity>> = {
  casein_dairy: 'last_meal',
};

export function mealAffinity(familyName: string | null): MealAffinity | null {
  if (familyName === null || !isFoodFamily(familyName)) return null;
  return MEAL_AFFINITY[familyName] ?? null;
}
