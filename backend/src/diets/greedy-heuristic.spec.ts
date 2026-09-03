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

describe('generateDietItems', () => {
  it('splits the target evenly across mealCount and lands within +-5% tolerance', () => {
    const result = generateDietItems({
      targetCalories: 2000,
      targetProteinG: 150,
      targetCarbsG: 224,
      targetFatG: 56,
      mealCount: 4,
      candidatesByRole: balancedCandidates(),
    });

    expect(result.items).toHaveLength(16); // 4 meals x 4 role slots
    const drift = Math.abs(result.totalCalories - 2000) / 2000;
    expect(drift).toBeLessThanOrEqual(0.05);
  });

  it('produces one item per required role for every meal slot used', () => {
    const result = generateDietItems({
      targetCalories: 1800,
      targetProteinG: 140,
      targetCarbsG: 180,
      targetFatG: 50,
      mealCount: 3,
      candidatesByRole: balancedCandidates(),
    });

    const mealTypesUsed = new Set(result.items.map((item) => item.mealType));
    expect(mealTypesUsed).toEqual(new Set(['breakfast', 'lunch', 'dinner']));
    for (const mealType of mealTypesUsed) {
      expect(
        result.items.filter((item) => item.mealType === mealType),
      ).toHaveLength(4);
    }
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

    // Protein-heavy split (36% of calories from protein) reproducing the
    // reported bug: the old even-calorie-split sizing left protein at
    // roughly half its target while calories stayed in tolerance.
    const result = generateDietItems({
      targetCalories: 2240,
      targetProteinG: 200,
      targetCarbsG: 180,
      targetFatG: 80,
      mealCount: 3,
      candidatesByRole: candidates,
    });

    const drift = (value: number, target: number) =>
      Math.abs(value - target) / target;
    expect(drift(result.totalCalories, 2240)).toBeLessThanOrEqual(0.05);
    expect(drift(result.totalProtein, 200)).toBeLessThanOrEqual(0.05);
    expect(drift(result.totalCarbs, 180)).toBeLessThanOrEqual(0.05);
    expect(drift(result.totalFat, 80)).toBeLessThanOrEqual(0.05);
  });

  it('round-robins mealType past 4, numbering repeats as later occurrences', () => {
    const result = generateDietItems({
      targetCalories: 3000,
      targetProteinG: 200,
      targetCarbsG: 300,
      targetFatG: 80,
      mealCount: 6,
      candidatesByRole: balancedCandidates(),
    });

    const slots = result.items
      .filter((item) => item.orderIndex === 0)
      .map((item) => ({
        mealType: item.mealType,
        mealOccurrence: item.mealOccurrence,
      }));
    expect(slots).toEqual([
      { mealType: 'breakfast', mealOccurrence: 1 },
      { mealType: 'lunch', mealOccurrence: 1 },
      { mealType: 'dinner', mealOccurrence: 1 },
      { mealType: 'snack', mealOccurrence: 1 },
      { mealType: 'breakfast', mealOccurrence: 2 },
      { mealType: 'lunch', mealOccurrence: 2 },
    ]);
  });

  it('avoids repeating the same dish across occurrences of the same mealType when another candidate exists', () => {
    const alt: FoodCandidate = { ...leanProtein, id: 'lean-protein-alt' };
    const candidates = new Map([['lean_protein', [leanProtein, alt]]]);

    const result = generateDietItems({
      targetCalories: 1000,
      targetProteinG: 80,
      targetCarbsG: 0,
      targetFatG: 0,
      mealCount: 8, // two breakfast occurrences
      candidatesByRole: candidates,
      pickRandom: (items) => items[0],
    });

    const breakfastFoodIds = result.items
      .filter((item) => item.mealType === 'breakfast')
      .map((item) => item.foodItemId);
    expect(breakfastFoodIds).toEqual([leanProtein.id, alt.id]);
  });

  it('falls back to repeating a dish when it is the only eligible candidate', () => {
    const candidates = new Map([['lean_protein', [leanProtein]]]);

    const result = generateDietItems({
      targetCalories: 1000,
      targetProteinG: 80,
      targetCarbsG: 0,
      targetFatG: 0,
      mealCount: 8,
      candidatesByRole: candidates,
    });

    const breakfastFoodIds = result.items
      .filter((item) => item.mealType === 'breakfast')
      .map((item) => item.foodItemId);
    expect(breakfastFoodIds).toEqual([leanProtein.id, leanProtein.id]);
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

  it('caps how much a single item can grow to close a shortfall, rather than letting it absorb all of it alone', () => {
    const proteinIsolate: FoodCandidate = {
      id: 'protein-isolate-3',
      caloriesPer100g: 100,
      proteinPer100g: 25,
      carbsPer100g: 0,
      fatPer100g: 0,
    };
    const carbIsolate: FoodCandidate = {
      id: 'carb-isolate-2',
      caloriesPer100g: 100,
      proteinPer100g: 0,
      carbsPer100g: 50,
      fatPer100g: 0,
    };
    const fatIsolate: FoodCandidate = { ...healthyFat, id: 'fat-isolate-2' };
    const pureCalorieVegetable: FoodCandidate = {
      id: 'pure-calorie-vegetable-1',
      caloriesPer100g: 100,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
    };
    const candidates = new Map([
      ['lean_protein', [proteinIsolate]],
      ['complex_carb', [carbIsolate]],
      ['healthy_fat', [fatIsolate]],
      ['vegetable', [pureCalorieVegetable]],
    ]);

    // Vegetable starts at 500g/500kcal (a quarter of the 2000kcal budget);
    // fully closing the shortfall alone would need ~1985g, but the cap
    // holds it to double its starting weight.
    const result = generateDietItems({
      targetCalories: 2000,
      targetProteinG: 1,
      targetCarbsG: 1,
      targetFatG: 1,
      mealCount: 1,
      candidatesByRole: candidates,
    });

    const vegItem = result.items.find(
      (item) => item.foodItemId === pureCalorieVegetable.id,
    );
    expect(vegItem?.weightGrams).toBe(1000);
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
