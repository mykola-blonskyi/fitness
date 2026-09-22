import type { foodCalories } from '../db/schema';

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

// The Food Family taxonomy (ADR-020). A closed list, so a family name
// outside it is a type error rather than a bad row. Lives here rather than
// with the seed scripts because generation and Food Replacement read it at
// runtime.
export const FOOD_FAMILIES = [
  'poultry',
  'red_meat',
  'white_fish',
  'red_fish',
  'seafood',
  'eggs',
  'casein_dairy',
  'legume_protein',
  'porridge',
  'grain_garnish',
  'starchy_vegetable',
  'bread',
  'salad_vegetable',
  'accent_vegetable',
  'cooked_vegetable',
  'mushroom',
  'berries',
  'fruit',
  'culinary_oil',
  'nuts_seeds',
  'fatty_fruit',
] as const;

export type FoodFamily = (typeof FOOD_FAMILIES)[number];

const FAMILY_SET: ReadonlySet<string> = new Set(FOOD_FAMILIES);

export function isFoodFamily(value: string): value is FoodFamily {
  return FAMILY_SET.has(value);
}

// The raw catalog row food-eligibility.ts judges, as opposed to
// FoodItemResponse, which is the browse surface's locale-resolved view.
export type FoodItemRow = typeof foodCalories.$inferSelect;

// The decimals are numbers here so no consumer has to know food_calories
// hands them back as strings.
export interface GenerationCandidate {
  id: string;
  roleId: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  familyName: string | null;
  categoryName: string | null;
}
