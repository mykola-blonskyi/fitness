import { generateDietItems, gramsForCalories } from './greedy-heuristic';
import { restrictToFavorites } from './favorite-restriction';
import type { FoodCandidate } from './diet.types';

const leanProtein: FoodCandidate = {
  id: 'lean-protein-1',
  caloriesPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
  familyName: null,
};
const fattyProtein: FoodCandidate = {
  id: 'fatty-protein-1',
  caloriesPer100g: 250,
  proteinPer100g: 26,
  carbsPer100g: 0,
  fatPer100g: 17,
  familyName: null,
};
const complexCarb: FoodCandidate = {
  id: 'complex-carb-1',
  caloriesPer100g: 130,
  proteinPer100g: 2.7,
  carbsPer100g: 28,
  fatPer100g: 0.3,
  familyName: null,
};
const vegetable: FoodCandidate = {
  id: 'vegetable-1',
  caloriesPer100g: 25,
  proteinPer100g: 2,
  carbsPer100g: 5,
  fatPer100g: 0.3,
  familyName: null,
};
const healthyFat: FoodCandidate = {
  id: 'healthy-fat-1',
  caloriesPer100g: 884,
  proteinPer100g: 0,
  carbsPer100g: 0,
  fatPer100g: 100,
  familyName: null,
};

function balancedCandidates(): Map<string, FoodCandidate[]> {
  return new Map([
    ['lean_protein', [leanProtein]],
    ['complex_carb', [complexCarb]],
    ['vegetable', [vegetable]],
    ['healthy_fat', [healthyFat]],
  ]);
}

// No vegetable role, so protein/carb/fat sizing alone accounts for the
// meal's full calorie share - isolates taper/tail presence checks from
// FITNESS-64 correction dropping carb as an overshoot side effect.
function threeRoleCandidates(): Map<string, FoodCandidate[]> {
  return new Map([
    ['lean_protein', [leanProtein]],
    ['complex_carb', [complexCarb]],
    ['healthy_fat', [healthyFat]],
  ]);
}

function foodIdsAt(
  items: ReturnType<typeof generateDietItems>['items'],
  position: number,
): string[] {
  return items
    .filter((item) => item.mealPosition === position)
    .map((item) => item.foodItemId);
}

describe('generateDietItems', () => {
  it('splits the target evenly across mealCount and lands within +-5% tolerance', () => {
    const result = generateDietItems({
      targetCalories: 2000,
      targetProteinG: 150,
      targetCarbsG: 224,
      targetFatG: 56,
      mealCount: 2,
      candidatesByRole: balancedCandidates(),
    });

    expect(result.items.length).toBeGreaterThan(0);
    const drift = Math.abs(result.totalCalories - 2000) / 2000;
    expect(drift).toBeLessThanOrEqual(0.05);
  });

  it('omits carb-role food entirely from the last meal once mealCount is 3 or more', () => {
    const result = generateDietItems({
      targetCalories: 1800,
      targetProteinG: 140,
      targetCarbsG: 180,
      targetFatG: 50,
      mealCount: 3,
      candidatesByRole: balancedCandidates(),
    });

    expect(foodIdsAt(result.items, 1)).toContain(complexCarb.id);
    expect(foodIdsAt(result.items, 2)).toContain(complexCarb.id);
    expect(foodIdsAt(result.items, 3)).not.toContain(complexCarb.id);
    // Only carbs are withheld from the tail - fat tapers across every meal,
    // so the last one still gets its (smallest) share.
    expect(foodIdsAt(result.items, 3)).toContain(healthyFat.id);
  });

  it('omits carb-role food from the last two meals once mealCount exceeds 3', () => {
    const result = generateDietItems({
      targetCalories: 2500,
      targetProteinG: 180,
      targetCarbsG: 250,
      targetFatG: 70,
      mealCount: 5,
      candidatesByRole: balancedCandidates(),
    });

    expect(foodIdsAt(result.items, 1)).toContain(complexCarb.id);
    expect(foodIdsAt(result.items, 2)).toContain(complexCarb.id);
    expect(foodIdsAt(result.items, 3)).toContain(complexCarb.id);
    expect(foodIdsAt(result.items, 4)).not.toContain(complexCarb.id);
    expect(foodIdsAt(result.items, 5)).not.toContain(complexCarb.id);
  });

  it('applies the normal taper with no carb-free tail at mealCount 1-2', () => {
    const one = generateDietItems({
      targetCalories: 2000,
      targetProteinG: 150,
      targetCarbsG: 200,
      targetFatG: 60,
      mealCount: 1,
      candidatesByRole: threeRoleCandidates(),
    });
    expect(foodIdsAt(one.items, 1)).toContain(complexCarb.id);

    const two = generateDietItems({
      targetCalories: 1800,
      targetProteinG: 140,
      targetCarbsG: 180,
      targetFatG: 50,
      mealCount: 2,
      candidatesByRole: threeRoleCandidates(),
    });
    expect(foodIdsAt(two.items, 1)).toContain(complexCarb.id);
    expect(foodIdsAt(two.items, 2)).toContain(complexCarb.id);
  });

  it('falls back to the next role in a macro group when the preferred role has no candidates', () => {
    const candidates = new Map([
      ['complex_carb', [complexCarb]],
      ['vegetable', [vegetable]],
      ['healthy_fat', [healthyFat]],
      // lean_protein has no candidates (e.g. excluded by Food Preference) -
      // fatty_protein is next in the chain.
      ['fatty_protein', [fattyProtein]],
    ]);

    const result = generateDietItems({
      targetCalories: 2000,
      targetProteinG: 150,
      targetCarbsG: 200,
      targetFatG: 60,
      mealCount: 1,
      candidatesByRole: candidates,
    });

    expect(
      result.items.some((item) => item.foodItemId === fattyProtein.id),
    ).toBe(true);
    expect(
      result.items.some((item) => item.foodItemId === leanProtein.id),
    ).toBe(false);
  });

  it('skips a macro group entirely when its whole chain has no candidates, without crashing', () => {
    const candidates = new Map([
      ['complex_carb', [complexCarb]],
      ['vegetable', [vegetable]],
      // No protein or fat roles at all - a user who excluded every protein
      // and fat source, for example.
    ]);

    const result = generateDietItems({
      targetCalories: 1500,
      targetProteinG: 100,
      targetCarbsG: 180,
      targetFatG: 40,
      mealCount: 2,
      candidatesByRole: candidates,
    });

    expect(result.items).toHaveLength(4); // 2 meals x 2 available role slots
    expect(result.items.every((item) => item.weightGrams > 0)).toBe(true);
  });

  it('adjusts the largest items to correct a drift back within tolerance', () => {
    // A very low target with coarse-calorie candidates forces the initial
    // per-item gram rounding (min 1g) to overshoot the target well beyond
    // 5% before adjustment - see greedy-heuristic.ts's comment on this
    // pass for why it targets carb/fat/vegetable items first.
    const coarse: FoodCandidate = {
      id: 'coarse-1',
      caloriesPer100g: 400,
      proteinPer100g: 10,
      carbsPer100g: 10,
      fatPer100g: 10,
      familyName: null,
    };
    const candidates = new Map([
      ['lean_protein', [coarse]],
      ['complex_carb', [coarse]],
      ['vegetable', [coarse]],
      ['healthy_fat', [coarse]],
    ]);

    const result = generateDietItems({
      targetCalories: 40,
      targetProteinG: 1,
      targetCarbsG: 1,
      targetFatG: 1,
      mealCount: 1,
      candidatesByRole: candidates,
    });

    const drift = Math.abs(result.totalCalories - 40) / 40;
    expect(drift).toBeLessThanOrEqual(0.05);
  });

  it('returns an empty, zeroed result when there are no candidates at all', () => {
    const result = generateDietItems({
      targetCalories: 1500,
      targetProteinG: 110,
      targetCarbsG: 180,
      targetFatG: 50,
      mealCount: 3,
      candidatesByRole: new Map(),
    });

    expect(result.items).toEqual([]);
    expect(result.totalCalories).toBe(0);
    expect(result.totalProtein).toBe(0);
    expect(result.totalCarbs).toBe(0);
    expect(result.totalFat).toBe(0);
  });

  it('uses a deterministic pickRandom when provided, for reproducible tests', () => {
    const alt: FoodCandidate = { ...leanProtein, id: 'lean-protein-alt' };
    const candidates = new Map([['lean_protein', [leanProtein, alt]]]);

    const result = generateDietItems({
      targetCalories: 500,
      targetProteinG: 40,
      targetCarbsG: 0,
      targetFatG: 0,
      mealCount: 1,
      candidatesByRole: candidates,
      pickRandom: (items) => items[items.length - 1],
    });

    expect(result.items[0].foodItemId).toBe(alt.id);
  });

  it('sizes portions off macro-gram targets so a high-protein target lands within tolerance on protein, carbs, and fat too', () => {
    // Near-pure-macro candidates isolate the sizing formula from real-food
    // cross-contamination (e.g. a protein source's incidental fat content),
    // which is what greedy-heuristic.ts's correction pass - calorie-only,
    // non-protein items first - is not designed to correct for.
    const proteinIsolate: FoodCandidate = {
      id: 'protein-isolate-1',
      caloriesPer100g: 100,
      proteinPer100g: 25,
      carbsPer100g: 0,
      fatPer100g: 0,
      familyName: null,
    };
    const carbIsolate: FoodCandidate = {
      id: 'carb-isolate-1',
      caloriesPer100g: 100,
      proteinPer100g: 0,
      carbsPer100g: 25,
      fatPer100g: 0,
      familyName: null,
    };
    const candidates = new Map([
      ['lean_protein', [proteinIsolate]],
      ['complex_carb', [carbIsolate]],
      ['healthy_fat', [healthyFat]],
    ]);

    // Calorie-consistent split (200*4 + 180*4 + 80*9 = 2240) at mealCount 2
    // so no meal's tapered carb/fat calories exceed its own equal share -
    // isolates the sizing-accuracy regression this test guards from the
    // separate carb-free-tail/protein-scaling behavior covered elsewhere.
    const result = generateDietItems({
      targetCalories: 2240,
      targetProteinG: 200,
      targetCarbsG: 180,
      targetFatG: 80,
      mealCount: 2,
      candidatesByRole: candidates,
    });

    const drift = (value: number, target: number) =>
      Math.abs(value - target) / target;
    expect(drift(result.totalCalories, 2240)).toBeLessThanOrEqual(0.05);
    expect(drift(result.totalProtein, 200)).toBeLessThanOrEqual(0.05);
    expect(drift(result.totalCarbs, 180)).toBeLessThanOrEqual(0.05);
    expect(drift(result.totalFat, 80)).toBeLessThanOrEqual(0.05);
  });

  it('skips a role with zero macro density instead of force-including it at a meaningless portion', () => {
    const zeroCarbCandidate: FoodCandidate = {
      id: 'zero-carb-1',
      caloriesPer100g: 200,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
      familyName: null,
    };
    const candidates = new Map([
      ['lean_protein', [leanProtein]],
      ['complex_carb', [zeroCarbCandidate]],
      ['healthy_fat', [healthyFat]],
    ]);

    const result = generateDietItems({
      targetCalories: 500,
      targetProteinG: 40,
      targetCarbsG: 50,
      targetFatG: 15,
      mealCount: 1,
      candidatesByRole: candidates,
    });

    expect(
      result.items.some((item) => item.foodItemId === zeroCarbCandidate.id),
    ).toBe(false);
    expect(
      result.items.some((item) => item.foodItemId === leanProtein.id),
    ).toBe(true);
  });

  it('skips a role whose computed portion would round below the minimum-gram floor', () => {
    const tinyCarbShare: FoodCandidate = {
      id: 'tiny-carb-share-1',
      caloriesPer100g: 200,
      proteinPer100g: 0,
      carbsPer100g: 100,
      fatPer100g: 0,
      familyName: null,
    };
    const candidates = new Map([
      ['lean_protein', [leanProtein]],
      ['complex_carb', [tinyCarbShare]],
      ['healthy_fat', [healthyFat]],
    ]);

    // mealCarbTarget = 0.001g -> raw grams = 0.001, rounds to 0.
    const result = generateDietItems({
      targetCalories: 500,
      targetProteinG: 40,
      targetCarbsG: 0.001,
      targetFatG: 15,
      mealCount: 1,
      candidatesByRole: candidates,
    });

    expect(
      result.items.some((item) => item.foodItemId === tinyCarbShare.id),
    ).toBe(false);
  });

  it('regression: a calorie-dense candidate against many small per-meal macro shares no longer blows the day past its calorie/macro ceiling', () => {
    // mealCount=10 gives every meal a small carb share; calorieDenseLowCarb's
    // low carb density needs ~400g to hit it, ballooning that one item to
    // 12x the meal's calorie budget - shaped after a production incident.
    const proteinIsolate: FoodCandidate = {
      id: 'protein-isolate-2',
      caloriesPer100g: 100,
      proteinPer100g: 25,
      carbsPer100g: 0,
      fatPer100g: 0,
      familyName: null,
    };
    const calorieDenseLowCarb: FoodCandidate = {
      id: 'calorie-dense-low-carb-1',
      caloriesPer100g: 600,
      proteinPer100g: 0,
      carbsPer100g: 5,
      fatPer100g: 0,
      familyName: null,
    };
    const candidates = new Map([
      ['lean_protein', [proteinIsolate]],
      ['complex_carb', [calorieDenseLowCarb]],
      ['healthy_fat', [healthyFat]],
    ]);

    const result = generateDietItems({
      targetCalories: 2000,
      targetProteinG: 150,
      targetCarbsG: 200,
      targetFatG: 50,
      mealCount: 10,
      candidatesByRole: candidates,
    });

    // Carbs land well under their own 5%-short floor here - see
    // shrinkTowardDelta's comment for why that's accepted over breaching
    // the (hard) calorie ceiling.
    expect(result.totalCalories).toBeLessThanOrEqual(2000);
    expect(result.totalProtein).toBeLessThanOrEqual(150);
    expect(result.totalCarbs).toBeLessThanOrEqual(200);
    expect(result.totalFat).toBeLessThanOrEqual(50);
    expect(result.items.every((item) => item.weightGrams >= 1)).toBe(true);
  });

  it('regression: a fatty/plant protein source with no carb, fat, or vegetable candidates to shrink instead still respects the calorie ceiling', () => {
    // Only a protein-role candidate is available, and its own low protein
    // density needs 300g to hit the protein target - which alone triples
    // the meal's calorie budget. With nothing else in the meal to shrink,
    // protein itself must become the last-resort shrink target or the
    // ceiling breaks - shaped after a real diet where a fatty protein's
    // incidental fat/calories, not the carb or fat role, drove the overshoot.
    const fattyProtein: FoodCandidate = {
      id: 'fatty-protein-2',
      caloriesPer100g: 250,
      proteinPer100g: 25,
      carbsPer100g: 0,
      fatPer100g: 17,
      familyName: null,
    };
    const candidates = new Map([['lean_protein', [fattyProtein]]]);

    const result = generateDietItems({
      targetCalories: 300,
      targetProteinG: 75,
      targetCarbsG: 0,
      targetFatG: 0,
      mealCount: 1,
      candidatesByRole: candidates,
    });

    expect(result.totalCalories).toBeLessThanOrEqual(300);
  });

  it('regression: a realistic (non-isolated) high-protein target no longer starves carbs and blows past the fat target (FITNESS-66)', () => {
    // balancedCandidates() carries incidental macros across roles (unlike
    // the isolated fixtures used elsewhere) - this is what exposed the drift.
    const result = generateDietItems({
      targetCalories: 2463,
      targetProteinG: 310,
      targetCarbsG: 153,
      targetFatG: 68,
      mealCount: 5,
      candidatesByRole: balancedCandidates(),
    });

    const drift = (value: number, target: number) =>
      Math.abs(value - target) / target;
    expect(drift(result.totalCalories, 2463)).toBeLessThanOrEqual(0.05);
    expect(drift(result.totalProtein, 310)).toBeLessThanOrEqual(0.05);
    expect(drift(result.totalCarbs, 153)).toBeLessThanOrEqual(0.1);
    expect(drift(result.totalFat, 68)).toBeLessThanOrEqual(0.1);
  });

  it('splits the difference between two macros carried by the same food instead of gutting one of them', () => {
    // 100g of the one candidate covers the carb target exactly but would
    // quadruple the fat target - there is no portion that satisfies both,
    // so the fit lands between them rather than sacrificing carbs outright.
    const carbAndFat: FoodCandidate = {
      id: 'carb-and-fat-1',
      caloriesPer100g: 100,
      proteinPer100g: 0,
      carbsPer100g: 20,
      fatPer100g: 20,
      familyName: null,
    };
    const result = generateDietItems({
      targetCalories: 100,
      targetProteinG: 0,
      targetCarbsG: 20,
      targetFatG: 5,
      mealCount: 1,
      candidatesByRole: new Map([['complex_carb', [carbAndFat]]]),
    });

    expect(result.totalCalories).toBeLessThanOrEqual(100);
    expect(result.totalCarbs).toBeGreaterThan(0);
    expect(result.totalCarbs).toBeLessThan(20);
    expect(result.totalFat).toBeLessThan(20);
  });

  it("drops the fat role when the carb source already carries the meal's fat", () => {
    const fattyCarb: FoodCandidate = {
      id: 'fatty-carb-1',
      caloriesPer100g: 500,
      proteinPer100g: 0,
      carbsPer100g: 40,
      fatPer100g: 40,
      familyName: null,
    };
    const candidates = new Map([
      ['complex_carb', [fattyCarb]],
      ['healthy_fat', [healthyFat]],
    ]);

    const result = generateDietItems({
      targetCalories: 250,
      targetProteinG: 0,
      targetCarbsG: 20,
      targetFatG: 5,
      mealCount: 1,
      candidatesByRole: candidates,
    });

    expect(result.totalCalories).toBeLessThanOrEqual(250);
    expect(result.items.some((item) => item.foodItemId === healthyFat.id)).toBe(
      false,
    );
  });

  it('keeps the sole protein item even when its own incidental fat exceeds a zero fat target', () => {
    const candidates = new Map([['lean_protein', [leanProtein]]]);

    const result = generateDietItems({
      targetCalories: 500,
      targetProteinG: 40,
      targetCarbsG: 0,
      targetFatG: 0,
      mealCount: 1,
      candidatesByRole: candidates,
    });

    expect(
      result.items.some((item) => item.foodItemId === leanProtein.id),
    ).toBe(true);
  });

  it('never sizes a single item past its role portion cap, however far short of the macro target that leaves it', () => {
    const diluteCarb: FoodCandidate = {
      id: 'dilute-carb-1',
      caloriesPer100g: 80,
      proteinPer100g: 2,
      carbsPer100g: 17,
      fatPer100g: 0.1,
      familyName: null,
    };

    const result = generateDietItems({
      targetCalories: 2000,
      targetProteinG: 0,
      targetCarbsG: 300,
      targetFatG: 0,
      mealCount: 1,
      candidatesByRole: new Map([['complex_carb', [diluteCarb]]]),
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].weightGrams).toBe(500);
    expect(result.totalCarbs).toBeLessThan(300);
  });

  it('passes over a protein source too dilute to reach the meal target, and a fatty one that would eat the fat budget', () => {
    const dilute: FoodCandidate = {
      id: 'dilute-protein-1',
      caloriesPer100g: 60,
      proteinPer100g: 5,
      carbsPer100g: 4,
      fatPer100g: 3,
      familyName: null,
    };

    const result = generateDietItems({
      targetCalories: 1200,
      targetProteinG: 120,
      targetCarbsG: 60,
      targetFatG: 30,
      mealCount: 1,
      candidatesByRole: new Map([
        ['lean_protein', [dilute, fattyProtein, leanProtein]],
      ]),
      // Would take the dilute candidate if it were still in the running.
      pickRandom: (items) => items[0],
    });

    expect(result.items[0].foodItemId).toBe(leanProtein.id);
  });

  it('regression: a high-protein target lands on protein, carbs and fat at once instead of trading one for another (ADR-019)', () => {
    // The production case behind ADR-019: the plan matched on calories but
    // came back 73g short on protein with nearly double the fat target.
    const result = generateDietItems({
      targetCalories: 2463,
      targetProteinG: 310,
      targetCarbsG: 153,
      targetFatG: 68,
      mealCount: 4,
      candidatesByRole: balancedCandidates(),
    });

    const drift = (value: number, target: number) =>
      Math.abs(value - target) / target;
    expect(result.totalCalories).toBeLessThanOrEqual(2463);
    expect(drift(result.totalProtein, 310)).toBeLessThanOrEqual(0.05);
    expect(drift(result.totalCarbs, 153)).toBeLessThanOrEqual(0.1);
    expect(drift(result.totalFat, 68)).toBeLessThanOrEqual(0.1);
  });

  it('picks a different food item for the same role across a multi-meal day when alternatives exist', () => {
    const proteins = [0, 1, 2, 3].map((i) => ({
      ...leanProtein,
      id: `role-protein-${i}`,
    }));
    const carbs = [0, 1, 2, 3].map((i) => ({
      ...complexCarb,
      id: `role-carb-${i}`,
    }));
    const vegetables = [0, 1, 2, 3].map((i) => ({
      ...vegetable,
      id: `role-vegetable-${i}`,
    }));
    const fats = [0, 1, 2, 3].map((i) => ({
      ...healthyFat,
      id: `role-fat-${i}`,
    }));

    const result = generateDietItems({
      targetCalories: 2000,
      targetProteinG: 150,
      targetCarbsG: 200,
      targetFatG: 60,
      mealCount: 4,
      candidatesByRole: new Map([
        ['lean_protein', proteins],
        ['complex_carb', carbs],
        ['vegetable', vegetables],
        ['healthy_fat', fats],
      ]),
      pickRandom: (items) => items[0],
    });

    const foodItemIds = result.items.map((item) => item.foodItemId);
    expect(new Set(foodItemIds).size).toBe(foodItemIds.length);
  });

  it('caps a protein family at two meals even when a naive picker would take a third from it', () => {
    const familyA1: FoodCandidate = {
      ...leanProtein,
      id: 'family-a-1',
      familyName: 'poultry',
    };
    const familyA2: FoodCandidate = {
      ...leanProtein,
      id: 'family-a-2',
      familyName: 'poultry',
    };
    const familyA3: FoodCandidate = {
      ...leanProtein,
      id: 'family-a-3',
      familyName: 'poultry',
    };
    const familyB1: FoodCandidate = {
      ...leanProtein,
      id: 'family-b-1',
      familyName: 'red_meat',
    };

    const result = generateDietItems({
      targetCalories: 1500,
      targetProteinG: 120,
      targetCarbsG: 0,
      targetFatG: 40,
      mealCount: 3,
      candidatesByRole: new Map([
        ['lean_protein', [familyA1, familyA2, familyA3, familyB1]],
      ]),
      pickRandom: (items) => items[0],
    });

    const familyAMeals = result.items.filter((item) =>
      [familyA1.id, familyA2.id, familyA3.id].includes(item.foodItemId),
    ).length;
    expect(familyAMeals).toBe(2);
    expect(foodIdsAt(result.items, 3)).toContain(familyB1.id);
  });

  it('draws a third meal from the same protein family rather than repeating an item once the cap is hit', () => {
    const familyA1: FoodCandidate = {
      ...leanProtein,
      id: 'family-only-a-1',
      familyName: 'white_fish',
    };
    const familyA2: FoodCandidate = {
      ...leanProtein,
      id: 'family-only-a-2',
      familyName: 'white_fish',
    };
    const familyA3: FoodCandidate = {
      ...leanProtein,
      id: 'family-only-a-3',
      familyName: 'white_fish',
    };

    const result = generateDietItems({
      targetCalories: 1500,
      targetProteinG: 120,
      targetCarbsG: 0,
      targetFatG: 40,
      mealCount: 3,
      candidatesByRole: new Map([
        ['lean_protein', [familyA1, familyA2, familyA3]],
      ]),
      pickRandom: (items) => items[0],
    });

    const foodItemIds = result.items.map((item) => item.foodItemId);
    expect(new Set(foodItemIds).size).toBe(foodItemIds.length);
    expect(foodIdsAt(result.items, 3)).toContain(familyA3.id);
  });

  it('still generates a meal from a single eligible candidate across a 4-meal day', () => {
    const result = generateDietItems({
      targetCalories: 1600,
      targetProteinG: 120,
      targetCarbsG: 0,
      targetFatG: 40,
      mealCount: 4,
      candidatesByRole: new Map([['lean_protein', [leanProtein]]]),
    });

    expect(result.items.length).toBeGreaterThan(0);
    for (let position = 1; position <= 4; position++) {
      expect(foodIdsAt(result.items, position)).toContain(leanProtein.id);
    }
  });

  it('never counts a family-less protein toward the cap, so a third of them still beats a family item', () => {
    // Ordered so items[0] takes the three family-less candidates first. Were
    // they pooled under one implicit family, the third meal would hit the cap
    // and take familyA instead.
    const noFamily = [1, 2, 3].map((i) => ({
      ...leanProtein,
      id: `no-family-${i}`,
      familyName: null,
    }));
    const familyA: FoodCandidate = {
      ...leanProtein,
      id: 'family-a-only',
      familyName: 'poultry',
    };

    const result = generateDietItems({
      targetCalories: 1600,
      targetProteinG: 120,
      targetCarbsG: 0,
      targetFatG: 40,
      mealCount: 4,
      candidatesByRole: new Map([['lean_protein', [...noFamily, familyA]]]),
      pickRandom: (items) => items[0],
    });

    expect(foodIdsAt(result.items, 3)).toContain(noFamily[2].id);
    expect(foodIdsAt(result.items, 4)).toContain(familyA.id);
    const foodItemIds = result.items.map((item) => item.foodItemId);
    expect(new Set(foodItemIds).size).toBe(4);
  });
});

function freeVegetables(
  count: number,
  family = 'salad_vegetable',
): FoodCandidate[] {
  return Array.from({ length: count }, (_, i) => ({
    ...vegetable,
    id: `${family}-${i + 1}`,
    familyName: family,
  }));
}

function poolWithFreeVegetables(count: number): Map<string, FoodCandidate[]> {
  return new Map([
    ['lean_protein', [leanProtein]],
    ['complex_carb', [complexCarb]],
    ['vegetable', freeVegetables(count)],
    ['healthy_fat', [healthyFat]],
  ]);
}

function plateMacros(
  items: ReturnType<typeof generateDietItems>['items'],
  pool: Map<string, FoodCandidate[]>,
) {
  const byId = new Map(
    [...pool.values()].flat().map((candidate) => [candidate.id, candidate]),
  );
  const sum = (per100g: (candidate: FoodCandidate) => number) =>
    items.reduce(
      (total, item) =>
        total + (per100g(byId.get(item.foodItemId)!) * item.weightGrams) / 100,
      0,
    );
  return {
    calories: sum((c) => c.caloriesPer100g),
    protein: sum((c) => c.proteinPer100g),
    carbs: sum((c) => c.carbsPer100g),
    fat: sum((c) => c.fatPer100g),
  };
}

function freeItemsAt(
  items: ReturnType<typeof generateDietItems>['items'],
  position: number,
) {
  return items.filter(
    (item) => item.mealPosition === position && !item.isCounted,
  );
}

describe('generateDietItems - Free Foods', () => {
  const target = {
    targetCalories: 2000,
    targetProteinG: 150,
    targetCarbsG: 200,
    targetFatG: 60,
  };

  it('serves three free vegetables per meal, each at its nominal portion', () => {
    const result = generateDietItems({
      ...target,
      mealCount: 3,
      candidatesByRole: poolWithFreeVegetables(12),
    });

    for (let position = 1; position <= 3; position++) {
      const free = freeItemsAt(result.items, position);
      expect(free).toHaveLength(3);
      expect(free.every((item) => item.weightGrams === 80)).toBe(true);
    }
  });

  it('holds the nominal portions even when the day has to shrink to its ceiling', () => {
    const result = generateDietItems({
      ...target,
      targetCalories: 600,
      mealCount: 3,
      candidatesByRole: poolWithFreeVegetables(12),
    });

    const free = result.items.filter((item) => !item.isCounted);
    expect(free).toHaveLength(9);
    expect(free.every((item) => item.weightGrams === 80)).toBe(true);
    expect(result.totalCalories + result.freeFoodCalories).toBeLessThanOrEqual(
      600,
    );
  });

  it('leaves the free vegetables out of the stored totals', () => {
    const pool = poolWithFreeVegetables(12);
    const byId = new Map(
      [...pool.values()].flat().map((candidate) => [candidate.id, candidate]),
    );
    const result = generateDietItems({
      ...target,
      mealCount: 3,
      candidatesByRole: pool,
    });

    const sum = (
      items: typeof result.items,
      per100g: (candidate: FoodCandidate) => number,
    ) =>
      items.reduce(
        (total, item) =>
          total +
          (per100g(byId.get(item.foodItemId)!) * item.weightGrams) / 100,
        0,
      );
    const counted = result.items.filter((item) => item.isCounted);

    expect(result.totalCalories).toBe(
      Math.round(sum(counted, (c) => c.caloriesPer100g)),
    );
    expect(result.totalProtein).toBe(
      Math.round(sum(counted, (c) => c.proteinPer100g)),
    );
    expect(sum(result.items, (c) => c.caloriesPer100g)).toBeGreaterThan(
      result.totalCalories,
    );
  });

  it('takes what the free vegetables actually cost off the calorie target before fitting', () => {
    const result = generateDietItems({
      ...target,
      mealCount: 3,
      candidatesByRole: poolWithFreeVegetables(12),
    });

    expect(result.freeFoodCalories).toBe(180);
    expect(result.fittedCalorieTarget).toBe(1820);
    expect(result.totalCalories).toBeLessThanOrEqual(
      result.fittedCalorieTarget,
    );
  });

  it('takes what they supply off the macro targets too, and fits to those', () => {
    const result = generateDietItems({
      ...target,
      mealCount: 3,
      candidatesByRole: poolWithFreeVegetables(12),
    });

    expect(result.fittedProteinTarget).toBe(136);
    expect(result.fittedCarbsTarget).toBe(164);
    expect(result.fittedFatTarget).toBe(58);
    expect(result.totalProtein).toBe(result.fittedProteinTarget);
    expect(result.totalCarbs).toBe(result.fittedCarbsTarget);
    expect(result.totalFat).toBe(result.fittedFatTarget);
  });

  it.each([3, 4, 5, 6])(
    'lands the whole plate on the day target at mealCount %i',
    (mealCount) => {
      const pool = poolWithFreeVegetables(20);
      const result = generateDietItems({
        ...target,
        mealCount,
        candidatesByRole: pool,
      });

      const plate = plateMacros(result.items, pool);
      const missed = (value: number, dayTarget: number) =>
        Math.abs(value - dayTarget);
      expect(missed(plate.protein, target.targetProteinG)).toBeLessThan(1);
      expect(missed(plate.carbs, target.targetCarbsG)).toBeLessThan(1);
      expect(missed(plate.fat, target.targetFatG)).toBeLessThan(1);
      expect(plate.calories).toBeLessThanOrEqual(target.targetCalories);
    },
  );

  it('keeps the calorie ceiling at six meals, where a flat allowance would break it', () => {
    const dense = freeVegetables(20).map((candidate) => ({
      ...candidate,
      caloriesPer100g: 46,
    }));
    const pool = poolWithFreeVegetables(0);
    pool.set('vegetable', dense);

    const result = generateDietItems({
      ...target,
      mealCount: 6,
      candidatesByRole: pool,
    });

    expect(result.freeFoodCalories).toBe(662);
    expect(result.totalCalories + result.freeFoodCalories).toBeLessThanOrEqual(
      2000,
    );
  });

  it('repeats a vegetable across meals rather than twice within one meal once the pool runs out', () => {
    const result = generateDietItems({
      ...target,
      mealCount: 6,
      candidatesByRole: poolWithFreeVegetables(4),
    });

    for (let position = 1; position <= 6; position++) {
      const free = freeItemsAt(result.items, position);
      expect(free).toHaveLength(3);
      const ids = free.map((item) => item.foodItemId);
      expect(new Set(ids).size).toBe(3);
    }
  });

  it('serves fewer than three when the whole pool holds fewer than three', () => {
    const result = generateDietItems({
      ...target,
      mealCount: 3,
      candidatesByRole: poolWithFreeVegetables(2),
    });

    for (let position = 1; position <= 3; position++) {
      expect(freeItemsAt(result.items, position)).toHaveLength(2);
    }
  });

  it('sizes a vegetable with no Family by the macro fit, counted like any other item', () => {
    const result = generateDietItems({
      ...target,
      mealCount: 2,
      candidatesByRole: balancedCandidates(),
    });

    const vegetables = result.items.filter(
      (item) => item.foodItemId === vegetable.id,
    );
    expect(vegetables.length).toBeGreaterThan(0);
    expect(vegetables.every((item) => item.isCounted)).toBe(true);
    expect(result.freeFoodCalories).toBe(0);
  });

  it("leaves a Free Food out of another role's slot instead of fitting a portion to it", () => {
    const freeCarb: FoodCandidate = {
      ...complexCarb,
      id: 'free-carb-1',
      familyName: 'salad_vegetable',
    };

    const result = generateDietItems({
      ...target,
      mealCount: 2,
      candidatesByRole: new Map([
        ['lean_protein', [leanProtein]],
        ['complex_carb', [freeCarb]],
        ['healthy_fat', [healthyFat]],
      ]),
    });

    expect(result.items.some((item) => item.foodItemId === freeCarb.id)).toBe(
      false,
    );
  });
});

// Reproduces what diets.service.ts does: restrictToFavorites over the whole
// role map, then generation.
describe('generateDietItems - Free Foods under a favorite', () => {
  const target = {
    targetCalories: 2000,
    targetProteinG: 150,
    targetCarbsG: 200,
    targetFatG: 60,
  };

  function mixedVegetablePool(): Map<string, FoodCandidate[]> {
    const pool = poolWithFreeVegetables(0);
    pool.set('vegetable', [
      ...freeVegetables(6, 'salad_vegetable'),
      ...freeVegetables(18, 'cooked_vegetable'),
    ]);
    return pool;
  }

  it('still fills every salad when one vegetable is favorited', () => {
    const pool = mixedVegetablePool();
    const result = generateDietItems({
      ...target,
      mealCount: 6,
      candidatesByRole: restrictToFavorites(
        pool,
        new Set(['salad_vegetable-1']),
      ),
      pickRandom: (items) => items[0],
    });

    for (let position = 1; position <= 6; position++) {
      const free = freeItemsAt(result.items, position);
      expect(free).toHaveLength(3);
      expect(new Set(free.map((item) => item.foodItemId)).size).toBe(3);
    }
  });

  it('does not serve the favorited vegetable as the whole day', () => {
    const pool = mixedVegetablePool();
    const result = generateDietItems({
      ...target,
      mealCount: 6,
      candidatesByRole: restrictToFavorites(
        pool,
        new Set(['salad_vegetable-1']),
      ),
      pickRandom: (items) => items[0],
    });

    const free = result.items.filter((item) => !item.isCounted);
    expect(new Set(free.map((item) => item.foodItemId)).size).toBe(18);
  });
});

describe('gramsForCalories', () => {
  it('scales grams so the candidate hits the requested calories', () => {
    // 165 kcal/100g -> 330 kcal needs 200g.
    expect(gramsForCalories(leanProtein, 330)).toBe(200);
  });

  it('clamps to MIN_WEIGHT_GRAMS when the requested calories round to zero', () => {
    expect(gramsForCalories(healthyFat, 1)).toBe(1);
  });
});
