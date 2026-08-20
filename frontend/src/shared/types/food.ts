// Mirrors backend/src/food-items/food-item.types.ts's Macros - the four
// macro fields travel together across the Zod schema, FoodItem response
// type, and the form's field list; one shared shape keeps them in sync.
export interface Macros {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}
