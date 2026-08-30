import type { ExclusionTargets } from '../food-preferences/food-preference.types';

export interface SwapCandidateRow {
  id: string;
  categoryId: string;
  subcategoryId: string;
  roleId: string;
}

export function isPreferenceExcluded(
  row: SwapCandidateRow,
  exclusions: ExclusionTargets,
): boolean {
  return (
    exclusions.food_item.has(row.id) ||
    exclusions.category.has(row.categoryId) ||
    exclusions.subcategory.has(row.subcategoryId) ||
    exclusions.role.has(row.roleId)
  );
}

export function eligibleReplacements<T extends SwapCandidateRow>(
  sameRoleRows: T[],
  currentId: string,
  exclusions: ExclusionTargets,
): T[] {
  return sameRoleRows.filter(
    (row) => row.id !== currentId && !isPreferenceExcluded(row, exclusions),
  );
}
