// The four macro fields always travel together - CreateFoodItemDto,
// FoodItemResponse, and seed-food-catalog.ts's CuratedItem each used to
// redefine them independently. One shared shape keeps a future rename or
// added field from drifting between the three.
export interface Macros {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}
