import { and, isNotNull, notInArray, type SQL } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';

export interface EligibilityRow {
  id: string;
  categoryId: string;
  subcategoryId: string;
  roleId: string;
  familyId: string | null;
}

export type Ineligibility = 'no_family' | 'preference_excluded';

// A Food Item with no Family is never generated (ADR-020) - that alone is
// what keeps flours, offal, babyfood and branded products out of the pool.
export function generationEligibleWhere(
  exclusions: ExclusionTargets,
): SQL | undefined {
  const excludedFoodItems = [...exclusions.food_item];
  const excludedCategories = [...exclusions.category];
  const excludedSubcategories = [...exclusions.subcategory];
  const excludedRoles = [...exclusions.role];

  return and(
    isNotNull(schema.foodCalories.familyId),
    excludedFoodItems.length > 0
      ? notInArray(schema.foodCalories.id, excludedFoodItems)
      : undefined,
    excludedCategories.length > 0
      ? notInArray(schema.foodCalories.categoryId, excludedCategories)
      : undefined,
    excludedSubcategories.length > 0
      ? notInArray(schema.foodCalories.subcategoryId, excludedSubcategories)
      : undefined,
    excludedRoles.length > 0
      ? notInArray(schema.foodCalories.roleId, excludedRoles)
      : undefined,
  );
}

// The same rule for a row already in hand, kept adjacent to the SQL form so
// the two cannot drift.
export function generationIneligibility(
  row: EligibilityRow,
  exclusions: ExclusionTargets,
): Ineligibility | null {
  if (row.familyId === null) {
    return 'no_family';
  }
  if (
    exclusions.food_item.has(row.id) ||
    exclusions.category.has(row.categoryId) ||
    exclusions.subcategory.has(row.subcategoryId) ||
    exclusions.role.has(row.roleId)
  ) {
    return 'preference_excluded';
  }
  return null;
}
