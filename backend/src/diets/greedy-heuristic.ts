// Greedy-heuristic diet generator - see docs/decisions.md ADR-011 and
// ADR-016. For each meal position (equal calories, carb/fat tapered by
// position, carb-free tail - see mealTargetsForCount), picks one Food Item
// per required Food Role, sizes protein/carb/fat role-slots off their
// macro-gram target and the candidate's per-100g macro density, sizes the
// vegetable role-slot off the meal's calorie share, then corrects each
// meal's own drift so its calorie total never exceeds target - shrinking
// carb/fat/vegetable items first and protein only as a last resort, since a
// protein source's own incidental fat/carbs can otherwise leave a meal with
// nothing left to shrink and still over the ceiling (FITNESS-64). Pure
// function, no I/O - testable without a database.

import {
  MEAL_ROLE_CHAINS,
  mealTargetsForCount,
  type FoodCandidate,
  type GeneratedDiet,
  type GeneratedDietItem,
} from './diet.types';

const MIN_WEIGHT_GRAMS = 1;
// A single item's correction can at most double or halve, so a meal's
// drift correction spreads across its items rather than one item
// absorbing the whole adjustment alone.
const GROWTH_CAP_MULTIPLIER = 2;

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
  // 1-6, validated at the point mealCount is set; not re-validated here.
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

// null signals the role can't be filled with a meaningful portion at all
// (zero macro density, or the computed portion rounds below
// MIN_WEIGHT_GRAMS) - callers skip the role for that meal rather than
// force-including a nutritionally meaningless amount.
function meaningfulGramsForMacro(
  macroPer100g: number,
  targetGrams: number,
): number | null {
  if (macroPer100g <= 0) return null;
  const grams = Math.round((targetGrams / macroPer100g) * 100);
  return grams >= MIN_WEIGHT_GRAMS ? grams : null;
}

function meaningfulGramsForCalories(
  candidate: Pick<FoodCandidate, 'caloriesPer100g'>,
  calories: number,
): number | null {
  const grams = Math.round((calories / candidate.caloriesPer100g) * 100);
  return grams >= MIN_WEIGHT_GRAMS ? grams : null;
}

interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function macroTotals(
  items: { candidate: FoodCandidate; weightGrams: number }[],
): MacroTotals {
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
  mealPosition: number;
  orderIndex: number;
  candidate: FoodCandidate;
  chainIndex: number;
  weightGrams: number;
}

type MealTargets = MacroTotals;

const METRICS = ['calories', 'protein', 'carbs', 'fat'] as const;
type Metric = (typeof METRICS)[number];

function perGramValue(candidate: FoodCandidate, metric: Metric): number {
  switch (metric) {
    case 'calories':
      return candidate.caloriesPer100g / 100;
    case 'protein':
      return candidate.proteinPer100g / 100;
    case 'carbs':
      return candidate.carbsPer100g / 100;
    case 'fat':
      return candidate.fatPer100g / 100;
  }
}

// Growth (closing a shortfall) prefers carb, then fat, then vegetable items
// (largest-calorie first within a group) and never touches protein - a
// shortfall means protein already hit its own target, so there's no reason
// to push it further.
const GROWTH_GROUP_ORDER: Record<number, number> = {
  [CARB_CHAIN_INDEX]: 0,
  [FAT_CHAIN_INDEX]: 1,
  [VEGETABLE_CHAIN_INDEX]: 2,
};

function growthOrder(items: WorkingItem[]): WorkingItem[] {
  return items
    .filter((item) => item.chainIndex !== PROTEIN_CHAIN_INDEX)
    .sort((a, b) => {
      const groupDiff =
        GROWTH_GROUP_ORDER[a.chainIndex] - GROWTH_GROUP_ORDER[b.chainIndex];
      if (groupDiff !== 0) return groupDiff;
      return (
        caloriesForGrams(b.candidate, b.weightGrams) -
        caloriesForGrams(a.candidate, a.weightGrams)
      );
    });
}

// Shrinking (closing an overshoot) prefers the same carb/fat/vegetable
// order, but falls back to protein as a last resort once those are
// exhausted: a fatty or plant protein source's own incidental fat/carbs can
// alone push a meal over its calorie ceiling even after every other role
// has been zeroed out, and the ceiling is the one hard constraint (FITNESS-64).
const SHRINK_GROUP_ORDER: Record<number, number> = {
  ...GROWTH_GROUP_ORDER,
  [PROTEIN_CHAIN_INDEX]: 3,
};

function shrinkOrder(items: WorkingItem[]): WorkingItem[] {
  return [...items].sort((a, b) => {
    const groupDiff =
      SHRINK_GROUP_ORDER[a.chainIndex] - SHRINK_GROUP_ORDER[b.chainIndex];
    if (groupDiff !== 0) return groupDiff;
    return (
      caloriesForGrams(b.candidate, b.weightGrams) -
      caloriesForGrams(a.candidate, a.weightGrams)
    );
  });
}

// Drops the item (weight 0) rather than leaving it at a token weight when
// the reduction rounds below MIN_WEIGHT_GRAMS. Unlike growTowardDelta,
// this has no guard against pushing another macro below its own floor -
// the calorie ceiling is the one hard constraint, so closing an overshoot
// must go through even at another macro's expense.
function shrinkTowardDelta(item: WorkingItem, gramsToRemove: number): number {
  const newGrams = Math.floor(item.weightGrams - gramsToRemove);
  if (newGrams < MIN_WEIGHT_GRAMS) {
    const appliedCalories = caloriesForGrams(item.candidate, -item.weightGrams);
    item.weightGrams = 0;
    return appliedCalories;
  }
  const appliedCalories = caloriesForGrams(
    item.candidate,
    newGrams - item.weightGrams,
  );
  item.weightGrams = newGrams;
  return appliedCalories;
}

// Bounded by the growth cap and by every metric's own remaining headroom
// to target, so closing a calorie shortfall can never push
// protein/carbs/fat past their own ceiling.
function growTowardDelta(
  item: WorkingItem,
  calorieDelta: number,
  totals: MacroTotals,
  targets: MealTargets,
): number {
  const preGrams = item.weightGrams;
  const desiredGrams = (calorieDelta / item.candidate.caloriesPer100g) * 100;
  let allowedGrowth = Math.min(
    desiredGrams,
    preGrams * (GROWTH_CAP_MULTIPLIER - 1),
  );

  for (const metric of METRICS) {
    const perG = perGramValue(item.candidate, metric);
    if (perG <= 0) continue;
    const headroom = Math.max(0, targets[metric] - totals[metric]);
    allowedGrowth = Math.min(allowedGrowth, headroom / perG);
  }

  const newGrams = Math.floor(preGrams + Math.max(0, allowedGrowth));
  if (newGrams === preGrams) return 0;
  const appliedCalories = caloriesForGrams(item.candidate, newGrams - preGrams);
  item.weightGrams = newGrams;
  return appliedCalories;
}

// Scoped to this meal's own drift only, never pooled with other meals. The
// delta's sign at the start decides shrink vs. grow for the whole pass:
// shrinkTowardDelta closes exactly to the remaining delta (or zeroes the
// item and continues) and growTowardDelta is capped at target, so neither
// can push the delta past zero and flip its sign mid-loop.
function correctMeal(
  mealItems: WorkingItem[],
  targets: MealTargets,
): WorkingItem[] {
  let totals = macroTotals(mealItems);
  let calorieDelta = targets.calories - totals.calories;

  const orderedItems =
    calorieDelta < 0 ? shrinkOrder(mealItems) : growthOrder(mealItems);

  for (const item of orderedItems) {
    if (Math.abs(calorieDelta) < 1 || item.weightGrams <= 0) continue;

    const appliedCalories =
      calorieDelta < 0
        ? shrinkTowardDelta(
            item,
            (-calorieDelta / item.candidate.caloriesPer100g) * 100,
          )
        : growTowardDelta(item, calorieDelta, totals, targets);

    calorieDelta -= appliedCalories;
    totals = macroTotals(mealItems);
  }

  return mealItems.filter((item) => item.weightGrams > 0);
}

export function generateDietItems(input: GreedyHeuristicInput): GeneratedDiet {
  const pick = input.pickRandom ?? defaultPick;
  const mealTargets = mealTargetsForCount(input.mealCount, {
    calories: input.targetCalories,
    proteinG: input.targetProteinG,
    carbsG: input.targetCarbsG,
    fatG: input.targetFatG,
  });

  const items: WorkingItem[] = [];

  for (const target of mealTargets) {
    const picks: { chainIndex: number; candidate: FoodCandidate }[] = [];
    MEAL_ROLE_CHAINS.forEach((chain, chainIndex) => {
      // A carb-free tail meal (see mealTargetsForCount) never gets a
      // carb-role food at all, not just a zero-sized one.
      if (chainIndex === CARB_CHAIN_INDEX && !target.carbEligible) return;
      for (const role of chain) {
        const candidates = input.candidatesByRole.get(role);
        if (candidates && candidates.length > 0) {
          picks.push({ chainIndex, candidate: pick(candidates) });
          break;
        }
      }
    });
    if (picks.length === 0) continue;

    const mealItems: WorkingItem[] = [];
    picks.forEach(({ chainIndex, candidate }) => {
      let weightGrams: number | null;
      switch (chainIndex) {
        case PROTEIN_CHAIN_INDEX:
          weightGrams = meaningfulGramsForMacro(
            candidate.proteinPer100g,
            target.proteinG,
          );
          break;
        case CARB_CHAIN_INDEX:
          weightGrams = meaningfulGramsForMacro(
            candidate.carbsPer100g,
            target.carbsG,
          );
          break;
        case FAT_CHAIN_INDEX:
          weightGrams = meaningfulGramsForMacro(
            candidate.fatPer100g,
            target.fatG,
          );
          break;
        default:
          weightGrams = meaningfulGramsForCalories(
            candidate,
            target.calories / picks.length,
          );
      }
      if (weightGrams === null) return;
      mealItems.push({
        mealPosition: target.position,
        orderIndex: 0,
        candidate,
        chainIndex,
        weightGrams,
      });
    });
    if (mealItems.length === 0) continue;

    const corrected = correctMeal(mealItems, {
      calories: target.calories,
      protein: target.proteinG,
      carbs: target.carbsG,
      fat: target.fatG,
    });
    corrected.forEach((item, orderIndex) => {
      item.orderIndex = orderIndex;
      items.push(item);
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

  const totals = macroTotals(items);
  const generatedItems: GeneratedDietItem[] = items.map((item) => ({
    mealPosition: item.mealPosition,
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
