// Greedy-heuristic diet generator - see docs/decisions.md ADR-011. For each
// meal, picks one Food Item per required Food Role, sizes protein/carb/fat
// role-slots off their macro-gram target and the candidate's per-100g macro
// density, sizes the vegetable role-slot off the meal's calorie share, then
// adjusts non-protein items if the day's total drifts outside tolerance.
// Pure function, no I/O - testable without a database.

import {
  MEAL_ROLE_CHAINS,
  MEAL_TYPES,
  type FoodCandidate,
  type GeneratedDiet,
  type GeneratedDietItem,
  type MealType,
} from './diet.types';

const CALORIE_TOLERANCE = 0.05;
const MIN_WEIGHT_GRAMS = 1;

// MEAL_ROLE_CHAINS index per macro group - see diet.types.ts.
const PROTEIN_CHAIN_INDEX = 0;
const CARB_CHAIN_INDEX = 1;
const VEGETABLE_CHAIN_INDEX = 2;
const FAT_CHAIN_INDEX = 3;

export interface GreedyHeuristicInput {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  // 1-4, validated at the point mealCount is set; not re-validated here.
  mealCount: number;
  candidatesByRole: Map<string, FoodCandidate[]>;
  // Injectable so tests can pick deterministically; defaults to random.
  pickRandom?: <T>(items: T[]) => T;
}

function defaultPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function caloriesForGrams(candidate: FoodCandidate, grams: number): number {
  return (candidate.caloriesPer100g * grams) / 100;
}

function clampToMinGrams(rawGrams: number): number {
  return Math.max(MIN_WEIGHT_GRAMS, Math.round(rawGrams));
}

export function gramsForCalories(
  candidate: Pick<FoodCandidate, 'caloriesPer100g'>,
  calories: number,
): number {
  return clampToMinGrams((calories / candidate.caloriesPer100g) * 100);
}

function gramsForMacro(macroPer100g: number, targetGrams: number): number {
  if (macroPer100g <= 0) {
    return MIN_WEIGHT_GRAMS;
  }
  return clampToMinGrams((targetGrams / macroPer100g) * 100);
}

function macroTotals(
  items: { candidate: FoodCandidate; weightGrams: number }[],
): { calories: number; protein: number; carbs: number; fat: number } {
  return items.reduce(
    (totals, item) => {
      const factor = item.weightGrams / 100;
      return {
        calories: totals.calories + item.candidate.caloriesPer100g * factor,
        protein: totals.protein + item.candidate.proteinPer100g * factor,
        carbs: totals.carbs + item.candidate.carbsPer100g * factor,
        fat: totals.fat + item.candidate.fatPer100g * factor,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

interface WorkingItem {
  mealType: MealType;
  orderIndex: number;
  candidate: FoodCandidate;
  chainIndex: number;
  weightGrams: number;
}

export function generateDietItems(input: GreedyHeuristicInput): GeneratedDiet {
  const pick = input.pickRandom ?? defaultPick;
  const mealTypes: MealType[] = [...MEAL_TYPES].slice(0, input.mealCount);
  const mealCalorieTarget = input.targetCalories / mealTypes.length;
  const mealProteinTarget = input.targetProteinG / mealTypes.length;
  const mealCarbTarget = input.targetCarbsG / mealTypes.length;
  const mealFatTarget = input.targetFatG / mealTypes.length;

  const items: WorkingItem[] = [];

  for (const mealType of mealTypes) {
    const picks: { chainIndex: number; candidate: FoodCandidate }[] = [];
    MEAL_ROLE_CHAINS.forEach((chain, chainIndex) => {
      for (const role of chain) {
        const candidates = input.candidatesByRole.get(role);
        if (candidates && candidates.length > 0) {
          picks.push({ chainIndex, candidate: pick(candidates) });
          break;
        }
      }
    });
    if (picks.length === 0) continue;

    picks.forEach(({ chainIndex, candidate }, orderIndex) => {
      let weightGrams: number;
      switch (chainIndex) {
        case PROTEIN_CHAIN_INDEX:
          weightGrams = gramsForMacro(
            candidate.proteinPer100g,
            mealProteinTarget,
          );
          break;
        case CARB_CHAIN_INDEX:
          weightGrams = gramsForMacro(candidate.carbsPer100g, mealCarbTarget);
          break;
        case FAT_CHAIN_INDEX:
          weightGrams = gramsForMacro(candidate.fatPer100g, mealFatTarget);
          break;
        default:
          weightGrams = gramsForCalories(
            candidate,
            mealCalorieTarget / picks.length,
          );
      }
      items.push({ mealType, orderIndex, candidate, chainIndex, weightGrams });
    });
  }

  if (items.length === 0) {
    return {
      items: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    };
  }

  // Correction targets calories only, adjusting carb/fat/vegetable items
  // first (largest-calorie within that preference order) so it doesn't undo
  // the protein accuracy the macro-driven sizing pass above already hit.
  let totals = macroTotals(items);
  let delta = input.targetCalories - totals.calories;
  const toleranceCalories = input.targetCalories * CALORIE_TOLERANCE;

  if (Math.abs(delta) > toleranceCalories) {
    const correctionGroupOrder: Record<number, number> = {
      [CARB_CHAIN_INDEX]: 0,
      [FAT_CHAIN_INDEX]: 1,
      [VEGETABLE_CHAIN_INDEX]: 2,
    };
    const byCorrectionOrder = items
      .filter((item) => item.chainIndex !== PROTEIN_CHAIN_INDEX)
      .sort((a, b) => {
        const groupDiff =
          correctionGroupOrder[a.chainIndex] -
          correctionGroupOrder[b.chainIndex];
        if (groupDiff !== 0) return groupDiff;
        return (
          caloriesForGrams(b.candidate, b.weightGrams) -
          caloriesForGrams(a.candidate, a.weightGrams)
        );
      });

    for (const item of byCorrectionOrder) {
      if (Math.abs(delta) < 1) break;

      const deltaGrams = (delta / item.candidate.caloriesPer100g) * 100;
      const newGrams = Math.max(
        MIN_WEIGHT_GRAMS,
        Math.round(item.weightGrams + deltaGrams),
      );
      const appliedDeltaCalories = caloriesForGrams(
        item.candidate,
        newGrams - item.weightGrams,
      );

      item.weightGrams = newGrams;
      delta -= appliedDeltaCalories;
    }

    totals = macroTotals(items);
  }

  const generatedItems: GeneratedDietItem[] = items.map((item) => ({
    mealType: item.mealType,
    foodItemId: item.candidate.id,
    weightGrams: item.weightGrams,
    orderIndex: item.orderIndex,
  }));

  return {
    items: generatedItems,
    totalCalories: Math.round(totals.calories),
    totalProtein: Math.round(totals.protein),
    totalCarbs: Math.round(totals.carbs),
    totalFat: Math.round(totals.fat),
  };
}
