import { and, isNotNull, notInArray, type SQL } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';
import type { DietType } from '../diet-preferences/diet-preference.types';
import { MEAL_ROLE_CHAINS, PROTEIN_CHAIN_INDEX } from '../diets/diet.types';
import {
  categoryNamesExcludedBy,
  proteinCategoriesFor,
  roleNamesExcludedBy,
} from '../diets/diet-preference-exclusions';

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

const GENERATED_ROLES: ReadonlySet<string> = new Set(MEAL_ROLE_CHAINS.flat());
const PROTEIN_ROLES: ReadonlySet<string> = new Set(
  MEAL_ROLE_CHAINS[PROTEIN_CHAIN_INDEX],
);

export interface ReachabilityFacts {
  familyId: string | null;
  caloriesPer100g: number;
  roleName: string | null;
  categoryName: string | null;
}

// Whether generation can actually produce this Food Item for this user, as
// opposed to merely not excluding it. Every clause mirrors a filter the
// generator really applies, so a "no" here is a promise the menu keeps.
// `familyId` alone used to stand in for this and was wrong in both
// directions: Role `fruit` is drawn by no slot, and Role `dairy` was drawn
// by none until ADR-023.
export function isGenerationReachable(
  facts: ReachabilityFacts,
  dietTypes: readonly DietType[],
): boolean {
  const { familyId, caloriesPer100g, roleName, categoryName } = facts;
  if (familyId === null) return false;
  // generate() skips these; greedy-heuristic divides by the value.
  if (caloriesPer100g <= 0) return false;
  if (roleName === null || !GENERATED_ROLES.has(roleName)) return false;
  if (roleNamesExcludedBy(dietTypes).has(roleName)) return false;
  if (
    categoryName !== null &&
    categoryNamesExcludedBy(dietTypes).has(categoryName)
  ) {
    return false;
  }
  if (PROTEIN_ROLES.has(roleName)) {
    return (
      categoryName !== null && proteinCategoriesFor(dietTypes).has(categoryName)
    );
  }
  return true;
}
