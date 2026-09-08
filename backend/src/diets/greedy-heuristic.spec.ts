import { generateDietItems, gramsForCalories } from './greedy-heuristic';
import type { FoodCandidate } from './diet.types';

const leanProtein: FoodCandidate = {
  id: 'lean-protein-1',
  caloriesPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
};
const fattyProtein: FoodCandidate = {
  id: 'fatty-protein-1',
  caloriesPer100g: 250,
  proteinPer100g: 26,
  carbsPer100g: 0,
  fatPer100g: 17,
};
const complexCarb: FoodCandidate = {
  id: 'complex-carb-1',
  caloriesPer100g: 130,
  proteinPer100g: 2.7,
  carbsPer100g: 28,
  fatPer100g: 0.3,
};
const vegetable: FoodCandidate = {
  id: 'vegetable-1',
  caloriesPer100g: 25,
  proteinPer100g: 2,
  carbsPer100g: 5,
  fatPer100g: 0.3,
};
const healthyFat: FoodCandidate = {
  id: 'healthy-fat-1',
  caloriesPer100g: 884,
  proteinPer100g: 0,
  carbsPer100g: 0,
  fatPer100g: 100,
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
    };
    const carbIsolate: FoodCandidate = {
      id: 'carb-isolate-1',
      caloriesPer100g: 100,
      proteinPer100g: 0,
      carbsPer100g: 25,
      fatPer100g: 0,
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
    };
    const calorieDenseLowCarb: FoodCandidate = {
      id: 'calorie-dense-low-carb-1',
      caloriesPer100g: 600,
      proteinPer100g: 0,
      carbsPer100g: 5,
      fatPer100g: 0,
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

  it('keeps a vegetable on the plate even when the carb role already covers the meal carbs', () => {
    const result = generateDietItems({
      targetCalories: 1200,
      targetProteinG: 60,
      targetCarbsG: 120,
      targetFatG: 30,
      mealCount: 2,
      candidatesByRole: balancedCandidates(),
    });

    expect(foodIdsAt(result.items, 1)).toContain(vegetable.id);
    expect(foodIdsAt(result.items, 2)).toContain(vegetable.id);
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
