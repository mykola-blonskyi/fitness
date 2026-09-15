// One role per macro group (protein/carb/vegetable/fat) so every meal is a
// balanced plate. Each inner array is a fallback chain, tried in order until
// a role has an eligible candidate after Food Preference exclusion.
export const MEAL_ROLE_CHAINS: readonly (readonly string[])[] = [
  ['lean_protein', 'fatty_protein', 'plant_protein', 'dairy'],
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

// mealCount >= 3 makes the last meal carb-free; past 3, the last two are -
// see ADR-016.
function tailCountFor(mealCount: number): number {
  if (mealCount > 3) return 2;
  if (mealCount >= 3) return 1;
  return 0;
}

// Carbs taper linearly by position across the carb-eligible meals only,
// so the day's full carb target lands on those meals rather than being
// reduced by the tail's share; fat tapers the same way but across every
// meal. Protein is split equally - it is the macro a plan is judged on,
// and deriving it from what a meal's calorie share has left over made
// early meals arithmetically impossible whenever carb+fat calories
// already exceeded that share (ADR-019). A meal's calories are therefore
// what its own macros cost, not a fixed share of the day; they are scaled
// down (never up) if the rounded macro targets together cost marginally
// more than the day's calorie target, which stays a hard ceiling.
export function mealTargetsForCount(
  mealCount: number,
  totals: DietMacroTotals,
): MealTarget[] {
  const tailCount = tailCountFor(mealCount);
  const carbEligibleCount = mealCount - tailCount;
  const carbTaperSum = (carbEligibleCount * (carbEligibleCount + 1)) / 2;
  const fatTaperSum = (mealCount * (mealCount + 1)) / 2;
  const proteinG = totals.proteinG / mealCount;

  const targets = Array.from({ length: mealCount }, (_, i) => {
    const position = i + 1;
    const carbEligible = position <= carbEligibleCount;
    const carbsG = carbEligible
      ? (totals.carbsG * (carbEligibleCount - position + 1)) / carbTaperSum
      : 0;
    const fatG = (totals.fatG * (mealCount - position + 1)) / fatTaperSum;
    return {
      position,
      calories:
        proteinG * PROTEIN_KCAL_PER_G +
        carbsG * CARB_KCAL_PER_G +
        fatG * FAT_KCAL_PER_G,
      proteinG,
      carbsG,
      fatG,
      carbEligible,
    };
  });

  const macroCalories = targets.reduce((sum, t) => sum + t.calories, 0);
  if (macroCalories <= totals.calories || macroCalories <= 0) return targets;
  const scale = totals.calories / macroCalories;
  return targets.map((t) => ({ ...t, calories: t.calories * scale }));
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
  familyName: string | null;
  // food_calories.category_id is NOT NULL, so generation always sees a
  // name; optional only so the pure-function specs need not thread it.
  categoryName?: string | null;
}

export interface GeneratedDietItem {
  mealPosition: number;
  foodItemId: string;
  weightGrams: number;
  orderIndex: number;
  isCounted: boolean;
}

export interface GeneratedDiet {
  items: GeneratedDietItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  freeFoodCalories: number;
  // The day's targets less what the Free Foods supply (ADR-020).
  fittedCalorieTarget: number;
  fittedProteinTarget: number;
  fittedCarbsTarget: number;
  fittedFatTarget: number;
}
