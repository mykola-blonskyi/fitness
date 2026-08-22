// Greedy-heuristic diet generator - see docs/decisions.md ADR-010's "close
// enough" philosophy and knowledge/business-rules.md "Diet menu
// generation is a greedy heuristic": "For each meal, pick one Food Item
// per required Food Role, then scale portion size (weight_grams) to hit
// that meal's calorie share; adjust the largest items if the day's total
// drifts outside tolerance (~+-5%) of the target." Pure function, no I/O -
// same "algorithm apart from persistence" split as
// calorie-targets/algorithms/mifflin-v1.ts, testable without a database.

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
  // 1-4, validated by users/dto/create-user.dto.ts at the point mealCount
  // is set; not re-validated here.
  mealCount: number;
  // Role name -> eligible candidates (already Food-Preference-filtered).
  candidatesByRole: Map<string, FoodCandidate[]>;
  // Injectable so tests can pick deterministically; defaults to a real
  // random pick for actual generation (variety across meals/regenerations
  // isn't a documented requirement, but is a reasonable default over
  // always picking the same item).
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

  // Adjust the largest items if the day's total drifts outside tolerance
  // (business-rules.md's literal wording) - applied to calories only, on
  // the items contributing the most calories first. Protein/carbs/fat
  // move proportionally with each adjusted item's grams; the per-macro
  // role diversity above (not an independent macro-correction pass) is
  // what keeps the day's macro totals in the same ballpark as the
  // target - same "close enough" simplification ADR-010 already accepted
  // for mifflin-v1.ts's carbsG.
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
