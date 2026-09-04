// Greedy-heuristic diet generator - see docs/decisions.md ADR-011 and
// ADR-016. For each meal position (equal calories, carb/fat tapered by
// position, carb-free tail - see mealTargetsForCount), picks one Food Item
// per required Food Role, sizes protein/carb/fat role-slots off their
// macro-gram target and the candidate's per-100g macro density, sizes the
// vegetable role-slot off the meal's calorie share, then corrects each
// meal's own drift so its calorie total never exceeds target - shrinking
// carb/fat/vegetable items first and protein only as a last resort, since a
// protein source's own incidental fat/carbs can otherwise leave a meal with
// nothing left to shrink and still over the ceiling (FITNESS-64), then caps
// carbs/fat individually against their own target too, since incidental
// content elsewhere can leave one over even once calories match (FITNESS-66).
// Pure function, no I/O - testable without a database.

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

// What's left of a macro's target after roles already picked this meal -
// an earlier role's incidental content counts against it too (FITNESS-66).
function remainingMacroGrams(
  itemsSoFar: { candidate: FoodCandidate; weightGrams: number }[],
  metric: 'carbs' | 'fat',
  targetGrams: number,
): number {
  const alreadyContributed = macroTotals(itemsSoFar)[metric];
  return Math.max(0, targetGrams - alreadyContributed);
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

// Ratio of a macro's current amount to its own target - tells which of
// carb/fat actually caused an over/undershoot, instead of always blaming
// carb (FITNESS-66).
function macroRatio(
  totals: MacroTotals,
  targets: MealTargets,
  metric: 'carbs' | 'fat',
): number {
  const target = targets[metric];
  if (target <= 0) return totals[metric] > 0 ? Infinity : 0;
  return totals[metric] / target;
}

// Shared by growthOrder/shrinkOrder: whichever of carb/fat is furthest from
// its own target goes first (grown toward it, or shrunk from it); vegetable
// is always last except protein, which only shrinkOrder includes, and only
// as the final fallback (FITNESS-64).
function macroGroupOrder(
  totals: MacroTotals,
  targets: MealTargets,
  direction: 'grow' | 'shrink',
): Record<number, number> {
  const carbRatio = macroRatio(totals, targets, 'carbs');
  const fatRatio = macroRatio(totals, targets, 'fat');
  const carbFirst =
    direction === 'grow' ? carbRatio <= fatRatio : carbRatio >= fatRatio;
  const order: Record<number, number> = {
    [CARB_CHAIN_INDEX]: carbFirst ? 0 : 1,
    [FAT_CHAIN_INDEX]: carbFirst ? 1 : 0,
    [VEGETABLE_CHAIN_INDEX]: 2,
  };
  if (direction === 'shrink') order[PROTEIN_CHAIN_INDEX] = 3;
  return order;
}

function growthOrder(
  items: WorkingItem[],
  totals: MacroTotals,
  targets: MealTargets,
): WorkingItem[] {
  const order = macroGroupOrder(totals, targets, 'grow');
  return items
    .filter((item) => item.chainIndex !== PROTEIN_CHAIN_INDEX)
    .sort((a, b) => {
      const groupDiff = order[a.chainIndex] - order[b.chainIndex];
      if (groupDiff !== 0) return groupDiff;
      return (
        caloriesForGrams(b.candidate, b.weightGrams) -
        caloriesForGrams(a.candidate, a.weightGrams)
      );
    });
}

function shrinkOrder(
  items: WorkingItem[],
  totals: MacroTotals,
  targets: MealTargets,
): WorkingItem[] {
  const order = macroGroupOrder(totals, targets, 'shrink');
  return [...items].sort((a, b) => {
    const groupDiff = order[a.chainIndex] - order[b.chainIndex];
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

// A carb/fat ceiling on top of correctMeal's calorie-only pass - incidental
// content can leave one individually over target even once calories match.
// Only ever reduces further (can't reopen the calorie ceiling), and never
// touches protein: better to accept the overage than gut the meal's only
// protein source over a secondary macro (FITNESS-66).
function shrinkMacroToTarget(
  mealItems: WorkingItem[],
  metric: 'carbs' | 'fat',
  targetGrams: number,
): void {
  let overage = macroTotals(mealItems)[metric] - targetGrams;
  if (overage <= 0) return;

  const priority = mealItems
    .filter((item) => item.chainIndex !== PROTEIN_CHAIN_INDEX)
    .sort(
      (a, b) =>
        perGramValue(b.candidate, metric) * b.weightGrams -
        perGramValue(a.candidate, metric) * a.weightGrams,
    );

  for (const item of priority) {
    if (overage <= 0 || item.weightGrams <= 0) continue;
    const perG = perGramValue(item.candidate, metric);
    if (perG <= 0) continue;

    const newGrams = Math.floor(item.weightGrams - overage / perG);
    if (newGrams < MIN_WEIGHT_GRAMS) {
      overage -= perG * item.weightGrams;
      item.weightGrams = 0;
    } else {
      overage -= perG * (item.weightGrams - newGrams);
      item.weightGrams = newGrams;
    }
  }
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
    calorieDelta < 0
      ? shrinkOrder(mealItems, totals, targets)
      : growthOrder(mealItems, totals, targets);

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

  shrinkMacroToTarget(mealItems, 'fat', targets.fat);
  shrinkMacroToTarget(mealItems, 'carbs', targets.carbs);

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
            remainingMacroGrams(mealItems, 'carbs', target.carbsG),
          );
          break;
        case FAT_CHAIN_INDEX:
          weightGrams = meaningfulGramsForMacro(
            candidate.fatPer100g,
            remainingMacroGrams(mealItems, 'fat', target.fatG),
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
