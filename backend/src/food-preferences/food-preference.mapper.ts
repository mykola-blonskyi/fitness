import type {
  FoodPreferenceTargetType,
  FoodPreferenceType,
} from './food-preference.types';

export interface FoodPreferenceResponse {
  id: string;
  type: FoodPreferenceType;
  targetType: FoodPreferenceTargetType;
  targetId: string;
  // Resolved display name of the targeted category/subcategory/role/food
  // item - null only in the unexpected case where the target row was
  // deleted after the preference was created (categories/roles are fixed
  // seed data that's never deleted, but food_calories rows aren't).
  targetName: string | null;
}

export interface FoodPreferenceRow {
  id: string;
  type: FoodPreferenceType;
  targetType: FoodPreferenceTargetType;
  targetId: string;
}

export function toFoodPreferenceResponse(
  row: FoodPreferenceRow,
  targetName: string | null,
): FoodPreferenceResponse {
  return {
    id: row.id,
    type: row.type,
    targetType: row.targetType,
    targetId: row.targetId,
    targetName,
  };
}
