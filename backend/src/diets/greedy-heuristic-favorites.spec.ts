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
const proteinB: FoodCandidate = { ...proteinA, id: 'protein-b' };

const baseTarget = {
  targetCalories: 1500,
  targetProteinG: 120,
  targetCarbsG: 0,
  targetFatG: 40,
};

const first = <T>(items: T[]): T => items[0];

function proteinIdsByMeal(result: ReturnType<typeof generateDietItems>) {
  return result.items
    .filter((item) => item.foodItemId.startsWith('protein'))
    .map((item) => item.foodItemId);
}

describe('generateDietItems - favorites narrow the macro slot (ADR-023)', () => {
  it('picks the same item as today when favoriteFoodItemIds is empty or omitted', () => {
    const withoutField = generateDietItems({
      ...baseTarget,
      mealCount: 1,
      candidatesByRole: new Map([['lean_protein', [proteinA, proteinB]]]),
      pickRandom: first,
    });
    const withEmptySet = generateDietItems({
      ...baseTarget,
      mealCount: 1,
      candidatesByRole: new Map([['lean_protein', [proteinA, proteinB]]]),
      favoriteFoodItemIds: new Set(),
      pickRandom: first,
    });

    expect(withoutField.items[0].foodItemId).toBe(proteinA.id);
    expect(withEmptySet.items[0].foodItemId).toBe(proteinA.id);
  });

  it('gives the protein slot to its favorite over an eligible non-favorite', () => {
    const result = generateDietItems({
      ...baseTarget,
      mealCount: 1,
      candidatesByRole: new Map([['lean_protein', [proteinA, proteinB]]]),
      favoriteFoodItemIds: new Set([proteinB.id]),
      pickRandom: first,
    });

    expect(result.items[0].foodItemId).toBe(proteinB.id);
  });

  it('keeps serving the one favorite rather than opening the protein slot back up', () => {
    const result = generateDietItems({
      ...baseTarget,
      mealCount: 2,
      candidatesByRole: new Map([['lean_protein', [proteinA, proteinB]]]),
      favoriteFoodItemIds: new Set([proteinA.id]),
      pickRandom: first,
    });

    expect(proteinIdsByMeal(result)).toEqual([proteinA.id, proteinA.id]);
  });

  it('round-robins the protein favorites so neither repeats before both are used', () => {
    const result = generateDietItems({
      ...baseTarget,
      mealCount: 4,
      candidatesByRole: new Map([['lean_protein', [proteinA, proteinB]]]),
      favoriteFoodItemIds: new Set([proteinA.id, proteinB.id]),
      pickRandom: first,
    });

    expect(proteinIdsByMeal(result)).toEqual([
      proteinA.id,
      proteinB.id,
      proteinA.id,
      proteinB.id,
    ]);
  });

  it('does not force in a favorite that fails the density/portion filter', () => {
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
      pickRandom: first,
    });

    expect(result.items[0].foodItemId).toBe(proteinA.id);
  });

  it('admits a favorite the 0.7 protein fat budget would reject', () => {
    const fatty: FoodCandidate = {
      id: 'fatty-favorite',
      caloriesPer100g: 235,
      proteinPer100g: 25,
      carbsPer100g: 0,
      fatPer100g: 15,
      familyName: null,
    };
    const candidatesByRole = new Map([['lean_protein', [fatty, proteinA]]]);

    const asFavorite = generateDietItems({
      ...baseTarget,
      mealCount: 1,
      candidatesByRole,
      favoriteFoodItemIds: new Set([fatty.id]),
      pickRandom: first,
    });
    const asPlainCandidate = generateDietItems({
      ...baseTarget,
      mealCount: 1,
      candidatesByRole,
      pickRandom: first,
    });

    expect(asFavorite.items[0].foodItemId).toBe(fatty.id);
    expect(asPlainCandidate.items[0].foodItemId).toBe(proteinA.id);
  });

  it('lets a fat-slot favorite repeat twice, then opens the normal pool', () => {
    const oilFavorite: FoodCandidate = {
      id: 'oil-favorite',
      caloriesPer100g: 884,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 100,
      familyName: null,
    };
    const oilPlain: FoodCandidate = { ...oilFavorite, id: 'oil-plain' };

    const result = generateDietItems({
      ...baseTarget,
      mealCount: 3,
      candidatesByRole: new Map([
        ['lean_protein', [proteinA]],
        ['healthy_fat', [oilFavorite, oilPlain]],
      ]),
      favoriteFoodItemIds: new Set([oilFavorite.id]),
      pickRandom: first,
    });

    const fats = result.items
      .filter((item) => item.foodItemId.startsWith('oil'))
      .map((item) => item.foodItemId);
    expect(fats).toEqual([oilFavorite.id, oilFavorite.id, oilPlain.id]);
  });
});

describe('generateDietItems - a Food Family can prefer a meal position (ADR-023)', () => {
  const casein: FoodCandidate = {
    id: 'cottage-cheese',
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    familyName: 'casein_dairy',
  };
  const poultry: FoodCandidate = {
    ...casein,
    id: 'chicken',
    familyName: 'poultry',
  };

  it('holds casein back for the last meal even when it would be picked first', () => {
    const result = generateDietItems({
      ...baseTarget,
      mealCount: 2,
      candidatesByRole: new Map([['lean_protein', [casein, poultry]]]),
      pickRandom: first,
    });

    expect(result.items.map((item) => item.foodItemId)).toEqual([
      poultry.id,
      casein.id,
    ]);
  });

  it('still uses casein when it is the only candidate for a non-last meal', () => {
    const result = generateDietItems({
      ...baseTarget,
      mealCount: 2,
      candidatesByRole: new Map([['lean_protein', [casein]]]),
      pickRandom: first,
    });

    expect(result.items.map((item) => item.foodItemId)).toEqual([
      casein.id,
      casein.id,
    ]);
  });
});
