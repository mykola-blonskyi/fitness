import { isFoodFamily, type FoodFamily } from '../food-items/food-item.types';

export type FreePortion = 'bulk' | 'accent';

// An allowlist, not "the vegetable Role minus the starchy ones", so a Food
// Item with no Family yet stays counted rather than potato going free.
const FREE_FOODS: Partial<
  Record<FoodFamily, { grams: number; portion: FreePortion }>
> = {
  salad_vegetable: { grams: 80, portion: 'bulk' },
  accent_vegetable: { grams: 15, portion: 'accent' },
  cooked_vegetable: { grams: 80, portion: 'bulk' },
};

function freeFood(familyName: string | null) {
  if (familyName === null || !isFoodFamily(familyName)) return null;
  return FREE_FOODS[familyName] ?? null;
}

export function freeFoodGrams(familyName: string | null): number | null {
  return freeFood(familyName)?.grams ?? null;
}

export function freeFoodPortion(familyName: string | null): FreePortion | null {
  return freeFood(familyName)?.portion ?? null;
}

export function isFreeFood(familyName: string | null): boolean {
  return freeFood(familyName) !== null;
}
