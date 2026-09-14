// Diet generator - see docs/decisions.md ADR-011, ADR-016 and ADR-019. For
// each meal (protein split equally, carbs tapered across the carb-eligible
// meals, fat tapered across all of them - see mealTargetsForCount) it picks
// one Food Item per macro role, preferring candidates dense enough to carry
// that role's share in a sensible portion, fits the portions to the meal's
// whole protein/carb/fat target at once, then shrinks the day
// proportionally if it lands over the calorie target. Free Foods (ADR-020)
// come off every target before that fit. Pure function, no I/O - testable
// without a database.

import {
  freeFoodGrams,
  freeFoodPortion,
  isFreeFood,
  type FreePortion,
} from './free-foods';
import {
  MEAL_ROLE_CHAINS,
  mealTargetsForCount,
  type FoodCandidate,
  type GeneratedDiet,
  type GeneratedDietItem,
  type MealTarget,
} from './diet.types';

const MIN_WEIGHT_GRAMS = 1;

// MEAL_ROLE_CHAINS index per macro group - see diet.types.ts.
const PROTEIN_CHAIN_INDEX = 0;
const CARB_CHAIN_INDEX = 1;
const VEGETABLE_CHAIN_INDEX = 2;
const FAT_CHAIN_INDEX = 3;

const MACROS = ['protein', 'carbs', 'fat'] as const;
type Macro = (typeof MACROS)[number];
const KCAL_PER_G: Record<Macro, number> = { protein: 4, carbs: 4, fat: 9 };

// The largest portion of one food a single meal should ask for. Doubles as
// the bar for choosing between a role's candidates: no portion sizing can
// rescue a candidate too dilute to reach the meal's target at all, so one
// that would need more than this is passed over for a denser sibling
// (a 310g/day protein target needs ~1kg of chicken, but ~3kg of cottage
// cheese - picking the latter is what left protein short).
const MAX_PORTION_GRAMS: Record<number, number> = {
  [PROTEIN_CHAIN_INDEX]: 600,
  [CARB_CHAIN_INDEX]: 500,
  [VEGETABLE_CHAIN_INDEX]: 400,
  [FAT_CHAIN_INDEX]: 80,
};

// A protein source brings its own fat; one that would spend more than this
// much of the meal's fat budget by itself leaves nothing for the fat role
// and pushes the day past its fat target, so a leaner sibling wins when
// there is one.
const PROTEIN_FAT_BUDGET_SHARE = 0.7;

const MAX_MEALS_PER_PROTEIN_FAMILY = 2;

// One preference chain per salad item, like MEAL_ROLE_CHAINS. The two
// bulk-only entries make ADR-020's "two of three are bulk" structural.
const SALAD_SLOTS: readonly (readonly FreePortion[])[] = [
  ['bulk'],
  ['bulk'],
  ['accent', 'bulk'],
];

const STARTING_PORTION_GRAMS: Record<number, number> = {
  [PROTEIN_CHAIN_INDEX]: 150,
  [CARB_CHAIN_INDEX]: 100,
  [VEGETABLE_CHAIN_INDEX]: 150,
  [FAT_CHAIN_INDEX]: 15,
};

const FIT_PASSES = 50;
const FIT_SETTLED_GRAMS = 0.01;

export interface GreedyHeuristicInput {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  // 1-6, validated at the point mealCount is set; not re-validated here.
  mealCount: number;
  candidatesByRole: Map<string, FoodCandidate[]>;
  // Optional so the existing specs need not thread it; generate() always
  // supplies it.
  favoriteFoodItemIds?: ReadonlySet<string>;
  // Injectable so tests can pick deterministically; defaults to random.
  pickRandom?: <T extends { id: string }>(items: T[]) => T;
}

function defaultPick<T extends { id: string }>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function gramsForCalories(
  candidate: Pick<FoodCandidate, 'caloriesPer100g'>,
  calories: number,
): number {
  return Math.max(
    MIN_WEIGHT_GRAMS,
    Math.round((calories / candidate.caloriesPer100g) * 100),
  );
}

function macroPer100g(candidate: FoodCandidate, macro: Macro): number {
  switch (macro) {
    case 'protein':
      return candidate.proteinPer100g;
    case 'carbs':
      return candidate.carbsPer100g;
    case 'fat':
      return candidate.fatPer100g;
  }
}

function macroForChain(chainIndex: number): Macro | null {
  switch (chainIndex) {
    case PROTEIN_CHAIN_INDEX:
      return 'protein';
    case CARB_CHAIN_INDEX:
      return 'carbs';
    case FAT_CHAIN_INDEX:
      return 'fat';
    default:
      return null;
  }
}

function targetMacroGrams(target: MealTarget, macro: Macro): number {
  switch (macro) {
    case 'protein':
      return target.proteinG;
    case 'carbs':
      return target.carbsG;
    case 'fat':
      return target.fatG;
  }
}

interface WorkingItem {
  mealPosition: number;
  orderIndex: number;
  candidate: FoodCandidate;
  chainIndex: number;
  weightGrams: number;
  isCounted: boolean;
}

function macroTotals(items: WorkingItem[]): Record<Macro, number> {
  const totals: Record<Macro, number> = { protein: 0, carbs: 0, fat: 0 };
  for (const item of items) {
    for (const macro of MACROS) {
      totals[macro] +=
        (macroPer100g(item.candidate, macro) * item.weightGrams) / 100;
    }
  }
  return totals;
}

function calorieTotal(items: WorkingItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum + (item.candidate.caloriesPer100g * item.weightGrams) / 100,
    0,
  );
}

// Candidates that can carry this meal's share of their own macro within
// MAX_PORTION_GRAMS. An empty result means the role isn't worth filling for
// this meal at all (no target to hit, or nothing with any of the macro in
// it); a role with only unreachable candidates falls back to its densest
// one rather than dropping the macro group entirely.
function eligibleCandidates(
  candidates: FoodCandidate[],
  chainIndex: number,
  target: MealTarget,
): FoodCandidate[] {
  const macro = macroForChain(chainIndex);
  if (macro === null) return candidates;

  const neededGrams = targetMacroGrams(target, macro);
  if (neededGrams <= 0) return [];

  const reachable = candidates.filter((candidate) => {
    const density = macroPer100g(candidate, macro);
    return (
      density > 0 &&
      (neededGrams / density) * 100 <= MAX_PORTION_GRAMS[chainIndex]
    );
  });

  if (chainIndex === PROTEIN_CHAIN_INDEX) {
    const lean = reachable.filter(
      (candidate) =>
        (neededGrams / candidate.proteinPer100g) * candidate.fatPer100g <=
        target.fatG * PROTEIN_FAT_BUDGET_SHARE,
    );
    if (lean.length > 0) return lean;
  }
  if (reachable.length > 0) return reachable;

  const densest = candidates.reduce((best, candidate) =>
    macroPer100g(candidate, macro) > macroPer100g(best, macro)
      ? candidate
      : best,
  );
  return macroPer100g(densest, macro) > 0 ? [densest] : [];
}

interface DayPicks {
  foodItemIds: Set<string>;
  mealsPerProteinFamily: Map<string, number>;
}

// A repeated item is worse than a third meal from one protein family, so
// the family cap relaxes before the no-repeat rule does: try unused-and-
// under-cap first, then just unused, then give up and allow a repeat.
function dayFilteredCandidates(
  eligible: FoodCandidate[],
  chainIndex: number,
  picked: DayPicks,
): FoodCandidate[] {
  const unused = eligible.filter(
    (candidate) => !picked.foodItemIds.has(candidate.id),
  );

  if (chainIndex === PROTEIN_CHAIN_INDEX) {
    const underCap = unused.filter(
      (candidate) =>
        candidate.familyName === null ||
        (picked.mealsPerProteinFamily.get(candidate.familyName) ?? 0) <
          MAX_MEALS_PER_PROTEIN_FAMILY,
    );
    if (underCap.length > 0) return underCap;
  }

  return unused.length > 0 ? unused : eligible;
}

function recordPick(
  picked: DayPicks,
  candidate: FoodCandidate,
  chainIndex: number,
): void {
  picked.foodItemIds.add(candidate.id);
  if (chainIndex === PROTEIN_CHAIN_INDEX && candidate.familyName !== null) {
    picked.mealsPerProteinFamily.set(
      candidate.familyName,
      (picked.mealsPerProteinFamily.get(candidate.familyName) ?? 0) + 1,
    );
  }
}

// Coordinate descent: each step resizes one item to the portion that
// minimises the meal's squared macro error with the others held fixed.
// Error is measured in calories (a gram of fat counts for 9, a gram of
// protein for 4) so no macro is quietly favoured, and each step is an exact
// line minimum, so the error never grows and portions settle. Fitting all
// three macros together is what lets a protein source's incidental fat be
// paid for out of the fat role instead of overshooting the day's fat.
function fitPortions(items: WorkingItem[], target: MealTarget): void {
  const targets = {
    protein: target.proteinG,
    carbs: target.carbsG,
    fat: target.fatG,
  };

  for (let pass = 0; pass < FIT_PASSES; pass++) {
    let largestMove = 0;

    for (const item of items) {
      const perGram = MACROS.map(
        (macro) =>
          (macroPer100g(item.candidate, macro) / 100) * KCAL_PER_G[macro],
      );
      const norm = perGram.reduce((sum, value) => sum + value * value, 0);
      if (norm === 0) continue;

      const totals = macroTotals(items);
      const step =
        MACROS.reduce(
          (sum, macro, i) =>
            sum +
            (targets[macro] - totals[macro]) * KCAL_PER_G[macro] * perGram[i],
          0,
        ) / norm;

      const settled = Math.min(
        MAX_PORTION_GRAMS[item.chainIndex],
        Math.max(0, item.weightGrams + step),
      );
      largestMove = Math.max(largestMove, Math.abs(settled - item.weightGrams));
      item.weightGrams = settled;
    }

    if (largestMove < FIT_SETTLED_GRAMS) break;
  }
}

// The day's calorie target is a ceiling, never a goal to grow into - a
// menu that lands under is fine, one that lands over is not (see
// knowledge/business-rules.md). Applied to the day rather than meal by
// meal, so a meal that needs a little more than its own macros cost (a
// protein source's incidental fat travels with the protein) can borrow
// from meals that came in under. What little has to come off comes off
// the carb/vegetable/fat items first: they are the ones a meal overshoots
// on, and protein is the target a menu is judged on.
function shrinkToCalorieCeiling(items: WorkingItem[], ceiling: number): void {
  const calories = calorieTotal(items);
  if (calories <= ceiling || calories <= 0) return;

  const secondary = items.filter(
    (item) => item.chainIndex !== PROTEIN_CHAIN_INDEX,
  );
  const secondaryCalories = calorieTotal(secondary);
  const excess = calories - ceiling;

  const [shrinking, scale] =
    secondaryCalories > excess
      ? [secondary, (secondaryCalories - excess) / secondaryCalories]
      : [items, ceiling / calories];

  for (const item of shrinking) {
    item.weightGrams = Math.floor(item.weightGrams * scale);
  }
}

// Leaves a slot empty rather than repeat a vegetable within one meal.
function pickFreeItems(
  position: number,
  candidatesByRole: Map<string, FoodCandidate[]>,
  pick: <T extends { id: string }>(items: T[]) => T,
  picked: DayPicks,
): WorkingItem[] {
  const free = MEAL_ROLE_CHAINS[VEGETABLE_CHAIN_INDEX].flatMap((role) =>
    (candidatesByRole.get(role) ?? []).filter((candidate) =>
      isFreeFood(candidate.familyName),
    ),
  );

  const mealItems: WorkingItem[] = [];
  for (const slot of SALAD_SLOTS) {
    const chosenIds = new Set(mealItems.map((item) => item.candidate.id));
    for (const portion of slot) {
      const available = free.filter(
        (candidate) =>
          freeFoodPortion(candidate.familyName) === portion &&
          !chosenIds.has(candidate.id),
      );
      if (available.length === 0) continue;

      const candidate = pick(
        dayFilteredCandidates(available, VEGETABLE_CHAIN_INDEX, picked),
      );
      recordPick(picked, candidate, VEGETABLE_CHAIN_INDEX);
      mealItems.push({
        mealPosition: position,
        orderIndex: 0,
        candidate,
        chainIndex: VEGETABLE_CHAIN_INDEX,
        weightGrams: freeFoodGrams(candidate.familyName)!,
        isCounted: false,
      });
      break;
    }
  }

  return mealItems;
}

function buildMeal(
  target: MealTarget,
  candidatesByRole: Map<string, FoodCandidate[]>,
  pick: <T extends { id: string }>(items: T[]) => T,
  picked: DayPicks,
  hasFreeItems: boolean,
): WorkingItem[] {
  const mealItems: WorkingItem[] = [];

  MEAL_ROLE_CHAINS.forEach((chain, chainIndex) => {
    // A carb-free tail meal (see mealTargetsForCount) never gets a
    // carb-role food at all, not just a zero-sized one.
    if (chainIndex === CARB_CHAIN_INDEX && !target.carbEligible) return;
    if (chainIndex === VEGETABLE_CHAIN_INDEX && hasFreeItems) return;

    for (const role of chain) {
      const candidates = (candidatesByRole.get(role) ?? []).filter(
        (candidate) => !isFreeFood(candidate.familyName),
      );
      if (candidates.length === 0) continue;
      const eligible = eligibleCandidates(candidates, chainIndex, target);
      if (eligible.length === 0) break;
      const candidate = pick(
        dayFilteredCandidates(eligible, chainIndex, picked),
      );
      recordPick(picked, candidate, chainIndex);
      mealItems.push({
        mealPosition: target.position,
        orderIndex: 0,
        candidate,
        chainIndex,
        weightGrams: STARTING_PORTION_GRAMS[chainIndex],
        isCounted: true,
      });
      break;
    }
  });

  if (mealItems.length === 0) return [];

  fitPortions(mealItems, target);
  for (const item of mealItems) {
    item.weightGrams = Math.round(item.weightGrams);
  }

  return mealItems;
}

export function generateDietItems(input: GreedyHeuristicInput): GeneratedDiet {
  const rawPick = input.pickRandom ?? defaultPick;
  const favoriteFoodItemIds = input.favoriteFoodItemIds ?? new Set<string>();
  const pick = <T extends { id: string }>(items: T[]): T => {
    const favorites = items.filter((item) => favoriteFoodItemIds.has(item.id));
    return rawPick(favorites.length > 0 ? favorites : items);
  };

  const picked: DayPicks = {
    foodItemIds: new Set(),
    mealsPerProteinFamily: new Map(),
  };

  const freeItems = Array.from({ length: input.mealCount }, (_, i) =>
    pickFreeItems(i + 1, input.candidatesByRole, pick, picked),
  ).flat();
  const mealsWithFreeItems = new Set(
    freeItems.map((item) => item.mealPosition),
  );

  // Every target drops, not just calories: the counted items cannot hit
  // full macros inside the smaller calorie envelope.
  const freeTotals = macroTotals(freeItems);
  const freeFoodCalories = calorieTotal(freeItems);
  const fittedCalorieTarget = Math.max(
    0,
    input.targetCalories - freeFoodCalories,
  );
  const fittedProteinTarget = Math.max(
    0,
    input.targetProteinG - freeTotals.protein,
  );
  const fittedCarbsTarget = Math.max(0, input.targetCarbsG - freeTotals.carbs);
  const fittedFatTarget = Math.max(0, input.targetFatG - freeTotals.fat);

  const mealTargets = mealTargetsForCount(input.mealCount, {
    calories: fittedCalorieTarget,
    proteinG: fittedProteinTarget,
    carbsG: fittedCarbsTarget,
    fatG: fittedFatTarget,
  });

  const countedItems = mealTargets.flatMap((target) =>
    buildMeal(
      target,
      input.candidatesByRole,
      pick,
      picked,
      mealsWithFreeItems.has(target.position),
    ),
  );
  shrinkToCalorieCeiling(countedItems, fittedCalorieTarget);

  const kept = [...freeItems, ...countedItems]
    .filter((item) => item.weightGrams >= MIN_WEIGHT_GRAMS)
    .sort(
      (a, b) => a.mealPosition - b.mealPosition || a.chainIndex - b.chainIndex,
    );
  const orderIndexByMeal = new Map<number, number>();
  for (const item of kept) {
    const orderIndex = orderIndexByMeal.get(item.mealPosition) ?? 0;
    item.orderIndex = orderIndex;
    orderIndexByMeal.set(item.mealPosition, orderIndex + 1);
  }

  const counted = kept.filter((item) => item.isCounted);
  const totals = macroTotals(counted);
  const generatedItems: GeneratedDietItem[] = kept.map((item) => ({
    mealPosition: item.mealPosition,
    foodItemId: item.candidate.id,
    weightGrams: item.weightGrams,
    orderIndex: item.orderIndex,
    isCounted: item.isCounted,
  }));

  return {
    items: generatedItems,
    totalCalories: Math.round(calorieTotal(counted)),
    totalProtein: Math.round(totals.protein),
    totalCarbs: Math.round(totals.carbs),
    totalFat: Math.round(totals.fat),
    freeFoodCalories: Math.round(freeFoodCalories),
    fittedCalorieTarget: Math.round(fittedCalorieTarget),
    fittedProteinTarget: Math.round(fittedProteinTarget),
    fittedCarbsTarget: Math.round(fittedCarbsTarget),
    fittedFatTarget: Math.round(fittedFatTarget),
  };
}
