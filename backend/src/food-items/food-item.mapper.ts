export interface FoodItemResponse {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  role: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
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
