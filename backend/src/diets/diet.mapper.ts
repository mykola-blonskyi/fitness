import type { diets, dietCalculationAlgorithms } from '../db/schema';

export type DietRow = typeof diets.$inferSelect;
export type DietCalculationAlgorithmRow =
  typeof dietCalculationAlgorithms.$inferSelect;

// Joined diet_items x food_calories row - per-item macros are always
// derived at read time from weightGrams x the Food Item's per-100g
// values, never stored (diet_items only carries weight_grams/meal_type/
// order_index per knowledge/domain-model.md "Diet Item") - same
// derive-don't-store convention as user.mapper.ts's calculateAge.
export interface DietItemWithFoodRow {
  id: string;
  mealType: string;
  mealOccurrence: number;
  orderIndex: number;
  weightGrams: string;
  foodItemId: string;
  foodItemName: string;
  foodItemImageUrl: string | null;
  foodItemRole: string;
  caloriesPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
}

export interface DietItemResponse {
  id: string;
  mealType: string;
  mealOccurrence: number;
  orderIndex: number;
  weightGrams: number;
  foodItem: {
    id: string;
    name: string;
    imageUrl: string | null;
    role: string;
  };
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DietResponse {
  id: string;
  createdAt: Date;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  algorithm: {
    code: string;
    name: string;
  };
  items: DietItemResponse[];
}

function toDietItemResponse(row: DietItemWithFoodRow): DietItemResponse {
  const grams = Number(row.weightGrams);
  const factor = grams / 100;
  return {
    id: row.id,
    mealType: row.mealType,
    mealOccurrence: row.mealOccurrence,
    orderIndex: row.orderIndex,
    weightGrams: grams,
    foodItem: {
      id: row.foodItemId,
      name: row.foodItemName,
      imageUrl: row.foodItemImageUrl,
      role: row.foodItemRole,
    },
    calories: Math.round(Number(row.caloriesPer100g) * factor),
    proteinG: Math.round(Number(row.proteinPer100g) * factor),
    carbsG: Math.round(Number(row.carbsPer100g) * factor),
    fatG: Math.round(Number(row.fatPer100g) * factor),
  };
}

export function toDietResponse(
  diet: DietRow,
  algorithm: DietCalculationAlgorithmRow,
  itemRows: DietItemWithFoodRow[],
): DietResponse {
  return {
    id: diet.id,
    createdAt: diet.createdAt,
    totalCalories: Number(diet.totalCalories),
    totalProtein: Number(diet.totalProtein),
    totalCarbs: Number(diet.totalCarbs),
    totalFat: Number(diet.totalFat),
    algorithm: {
      code: algorithm.code,
      name: algorithm.name,
    },
    items: itemRows.map(toDietItemResponse),
  };
}
