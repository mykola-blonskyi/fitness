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
      targetProteinG: 0.1,
      targetCarbsG: 0.1,
      targetFatG: 0.1,
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
