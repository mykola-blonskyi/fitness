// One role per macro group (protein/carb/vegetable/fat) so every meal is a
// balanced plate. Each inner array is a fallback chain, tried in order until
// a role has an eligible candidate after Food Preference exclusion.
export const MEAL_ROLE_CHAINS: readonly (readonly string[])[] = [
  ['lean_protein', 'fatty_protein', 'plant_protein'],
  ['complex_carb', 'simple_carb'],
  ['vegetable'],
  ['healthy_fat', 'saturated_fat'],
];

const PROTEIN_KCAL_PER_G = 4;
const CARB_KCAL_PER_G = 4;
const FAT_KCAL_PER_G = 9;

export interface DietMacroTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealTarget {
  // 1-based position within the day, "Meal 1".."Meal N" - see ADR-016.
  position: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  carbEligible: boolean;
}

// mealCount >= 3 makes the last meal carb-free/low-fat; past 3, the last two
// are - see ADR-016.
function tailCountFor(mealCount: number): number {
  if (mealCount > 3) return 2;
  if (mealCount >= 3) return 1;
  return 0;
}

// Carb/fat taper linearly by position across carb-eligible meals only, so
// the day's full carb/fat totals land on eligible meals rather than being
// reduced by the tail's share. Protein fills each meal's remaining calories
// - clamped at 0, then the whole set rescaled down (never up) if that sum
// would exceed totals.proteinG, since independent per-meal clamping alone
// can inflate the day total past it (see ADR-016).
export function mealTargetsForCount(
  mealCount: number,
  totals: DietMacroTotals,
): MealTarget[] {
  const tailCount = tailCountFor(mealCount);
  const carbEligibleCount = mealCount - tailCount;
  const taperWeightSum = (carbEligibleCount * (carbEligibleCount + 1)) / 2;
  const calories = totals.calories / mealCount;

  const positions = Array.from({ length: mealCount }, (_, i) => {
    const position = i + 1;
    const carbEligible = position <= carbEligibleCount;
    const taperWeight = carbEligible ? carbEligibleCount - position + 1 : 0;
    const carbsG = carbEligible
      ? (totals.carbsG * taperWeight) / taperWeightSum
      : 0;
    const fatG = carbEligible
      ? (totals.fatG * taperWeight) / taperWeightSum
      : 0;
    const rawProteinG = Math.max(
      0,
      (calories - carbsG * CARB_KCAL_PER_G - fatG * FAT_KCAL_PER_G) /
        PROTEIN_KCAL_PER_G,
    );
    return { position, carbEligible, carbsG, fatG, rawProteinG };
  });

  const rawProteinSum = positions.reduce((sum, p) => sum + p.rawProteinG, 0);
  const proteinScale =
    rawProteinSum > totals.proteinG && rawProteinSum > 0
      ? totals.proteinG / rawProteinSum
      : 1;

  return positions.map((p) => ({
    position: p.position,
    calories,
    proteinG: p.rawProteinG * proteinScale,
    carbsG: p.carbsG,
    fatG: p.fatG,
    carbEligible: p.carbEligible,
  }));
}

// mealPositions absent from overrides keep their natural ascending
// position; overrides are only ever a full-set replace (see
// reorderMeals in diets.service.ts), so a partial override list is not
// an expected input but is handled defensively rather than assumed away.
export function resolveMealOrder(
  mealPositions: readonly number[],
  overrides: readonly { mealPosition: number; displayOrder: number }[],
): number[] {
  if (overrides.length === 0) {
    return [...mealPositions].sort((a, b) => a - b);
  }
  const displayOrderByPosition = new Map(
    overrides.map((o) => [o.mealPosition, o.displayOrder]),
  );
  return [...mealPositions].sort(
    (a, b) =>
      (displayOrderByPosition.get(a) ?? a) -
      (displayOrderByPosition.get(b) ?? b),
  );
}

export interface FoodCandidate {
  id: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface GeneratedDietItem {
  mealPosition: number;
  foodItemId: string;
  weightGrams: number;
  orderIndex: number;
}

export interface GeneratedDiet {
  items: GeneratedDietItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}
