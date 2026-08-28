import type { Macros } from '../../food-items/food-item.types';

export interface AdminFoodItemResponse extends Macros {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  role: string;
  imageUrl: string | null;
  isVerified: boolean;
  source: string | null;
  sourceId: string | null;
  createdAt: string;
}

export interface AdminFoodItemRow {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  role: string;
  caloriesPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
  imageUrl: string | null;
  isVerified: boolean;
  source: string | null;
  sourceId: string | null;
  createdAt: Date;
}

export function toAdminFoodItemResponse(
  row: AdminFoodItemRow,
): AdminFoodItemResponse {
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
    imageUrl: row.imageUrl,
    isVerified: row.isVerified,
    source: row.source,
    sourceId: row.sourceId,
    createdAt: row.createdAt.toISOString(),
  };
}
