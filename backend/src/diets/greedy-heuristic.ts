// Greedy-heuristic diet generator - see docs/decisions.md ADR-010. For each
// meal, picks one Food Item per required Food Role, scales portion size to
// hit that meal's calorie share, then adjusts the largest items if the
// day's total drifts outside tolerance. Pure function, no I/O - testable
// without a database.

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

export interface GreedyHeuristicInput {
  targetCalories: number;
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

function gramsForCalories(candidate: FoodCandidate, calories: number): number {
  return Math.max(
    MIN_WEIGHT_GRAMS,
    Math.round((calories / candidate.caloriesPer100g) * 100),
  );
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
  weightGrams: number;
}

export function generateDietItems(input: GreedyHeuristicInput): GeneratedDiet {
  const pick = input.pickRandom ?? defaultPick;
  const mealTypes: MealType[] = [...MEAL_TYPES].slice(0, input.mealCount);
  const mealTarget = input.targetCalories / mealTypes.length;

  const items: WorkingItem[] = [];

  for (const mealType of mealTypes) {
    const picks: FoodCandidate[] = [];
    for (const chain of MEAL_ROLE_CHAINS) {
      for (const role of chain) {
        const candidates = input.candidatesByRole.get(role);
        if (candidates && candidates.length > 0) {
          picks.push(pick(candidates));
          break;
        }
      }
    }
    if (picks.length === 0) continue;

    const perItemTarget = mealTarget / picks.length;
    picks.forEach((candidate, orderIndex) => {
      items.push({
        mealType,
        orderIndex,
        candidate,
        weightGrams: gramsForCalories(candidate, perItemTarget),
      });
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

  // Correction targets calories only, on the items contributing the most
  // calories first; protein/carbs/fat move proportionally with each
  // adjusted item's grams rather than getting an independent pass.
  let totals = macroTotals(items);
  let delta = input.targetCalories - totals.calories;
  const toleranceCalories = input.targetCalories * CALORIE_TOLERANCE;

  if (Math.abs(delta) > toleranceCalories) {
    const byCaloriesDesc = [...items].sort(
      (a, b) =>
        caloriesForGrams(b.candidate, b.weightGrams) -
        caloriesForGrams(a.candidate, a.weightGrams),
    );

    for (const item of byCaloriesDesc) {
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
