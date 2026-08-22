import { generateDietItems } from './greedy-heuristic';
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
    // pass for why it targets the largest items first.
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
      mealCount: 1,
      candidatesByRole: candidates,
    });

    const drift = Math.abs(result.totalCalories - 40) / 40;
    expect(drift).toBeLessThanOrEqual(0.05);
  });

  it('returns an empty, zeroed result when there are no candidates at all', () => {
    const result = generateDietItems({
      targetCalories: 1500,
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
      mealCount: 1,
      candidatesByRole: candidates,
      pickRandom: (items) => items[items.length - 1],
    });

    expect(result.items[0].foodItemId).toBe(alt.id);
  });
});
