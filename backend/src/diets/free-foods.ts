import { isFoodFamily, type FoodFamily } from '../food-items/food-item.types';

// An allowlist, not "the vegetable Role minus the starchy ones", so a Food
// Item with no Family yet stays counted rather than potato going free.
const NOMINAL_GRAMS: Partial<Record<FoodFamily, number>> = {
  salad_vegetable: 80,
  cooked_vegetable: 80,
};

export function freeFoodGrams(familyName: string | null): number | null {
  if (familyName === null || !isFoodFamily(familyName)) return null;
  return NOMINAL_GRAMS[familyName] ?? null;
}

export function isFreeFood(familyName: string | null): boolean {
  return freeFoodGrams(familyName) !== null;
}
