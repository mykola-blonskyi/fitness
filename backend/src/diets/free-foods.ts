import { isFoodFamily, type FoodFamily } from '../food-items/food-item.types';

// An allowlist of Families rather than "the vegetable Role minus the
// starchy ones": a Food Item whose Family is unset - the norm until the
// classification pass has run over a catalog - must stay counted, or
// potato would be free (ADR-020).
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
