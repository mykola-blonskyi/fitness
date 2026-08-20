import type { Macros } from './food-item.types';

export interface FoodItemResponse extends Macros {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  role: string;
  isVerified: boolean;
}

export interface TaxonomyResponse {
  categories: {
    id: string;
    name: string;
    subcategories: { id: string; name: string }[];
  }[];
  roles: { id: string; name: string }[];
}

// Shape of the joined select() projection both list() and create() query
// (categoryName/subcategoryName/roleName resolved via the same three
// joins) - numeric columns come back as strings from Drizzle/pg, same as
// daily-log.mapper.ts's weight handling.
export interface FoodItemRow {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  role: string;
  caloriesPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
  isVerified: boolean;
}

export function toFoodItemResponse(row: FoodItemRow): FoodItemResponse {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    role: row.role,
    caloriesPer100g: Number(row.caloriesPer100g),
    proteinPer100g: Number(row.proteinPer100g),
    carbsPer100g: Number(row.carbsPer100g),
    fatPer100g: Number(row.fatPer100g),
    isVerified: row.isVerified,
  };
}
