import { generateDietItems } from './greedy-heuristic';
import type { FoodCandidate } from './diet.types';

const proteinA: FoodCandidate = {
  id: 'protein-a',
  caloriesPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
  familyName: null,
};
const proteinB: FoodCandidate = {
  id: 'protein-b',
  caloriesPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
  familyName: null,
};

const baseTarget = {
  targetCalories: 1500,
  targetProteinG: 120,
  targetCarbsG: 0,
  targetFatG: 40,
};

describe('generateDietItems - favorites bias the pick', () => {
  it('picks the same item as today when favoriteFoodItemIds is empty or omitted', () => {
    const withoutField = generateDietItems({
      ...baseTarget,
      mealCount: 1,
      candidatesByRole: new Map([['lean_protein', [proteinA, proteinB]]]),
      pickRandom: (items) => items[0],
    });
    const withEmptySet = generateDietItems({
      ...baseTarget,
      mealCount: 1,
      candidatesByRole: new Map([['lean_protein', [proteinA, proteinB]]]),
      favoriteFoodItemIds: new Set(),
      pickRandom: (items) => items[0],
    });

    expect(withoutField.items[0].foodItemId).toBe(proteinA.id);
    expect(withEmptySet.items[0].foodItemId).toBe(proteinA.id);
  });

  it('prefers an eligible favorite over an eligible non-favorite in the same role', () => {
    const result = generateDietItems({
      ...baseTarget,
      mealCount: 1,
      candidatesByRole: new Map([['lean_protein', [proteinA, proteinB]]]),
      favoriteFoodItemIds: new Set([proteinB.id]),
      pickRandom: (items) => items[0],
    });

    expect(result.items[0].foodItemId).toBe(proteinB.id);
  });

  it('falls back to the full eligible pool once the only favorite in a role is already used that day', () => {
    const result = generateDietItems({
      ...baseTarget,
      mealCount: 2,
      candidatesByRole: new Map([['lean_protein', [proteinA, proteinB]]]),
      favoriteFoodItemIds: new Set([proteinA.id]),
      pickRandom: (items) => items[0],
    });

    expect(result.items.filter((i) => i.mealPosition === 1)[0].foodItemId).toBe(
      proteinA.id,
    );
    expect(result.items.filter((i) => i.mealPosition === 2)[0].foodItemId).toBe(
      proteinB.id,
    );
  });

  it('does not force in a favorite that fails the density/portion eligibility filter', () => {
    const dilute: FoodCandidate = {
      id: 'dilute-favorite',
      caloriesPer100g: 60,
      proteinPer100g: 5,
      carbsPer100g: 4,
      fatPer100g: 3,
      familyName: null,
    };

    const result = generateDietItems({
      ...baseTarget,
      mealCount: 1,
      candidatesByRole: new Map([['lean_protein', [dilute, proteinA]]]),
      favoriteFoodItemIds: new Set([dilute.id]),
      pickRandom: (items) => items[0],
    });

    expect(result.items[0].foodItemId).toBe(proteinA.id);
  });
});
