import { generateDietItems } from './greedy-heuristic';
import type { FoodCandidate } from './diet.types';

const baseTarget = {
  targetCalories: 1500,
  targetProteinG: 120,
  targetCarbsG: 0,
  targetFatG: 40,
};

const first = <T>(items: T[]): T => items[0];

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

  it('reaches casein through Role dairy, which the protein pool now covers', () => {
    const result = generateDietItems({
      ...baseTarget,
      mealCount: 2,
      candidatesByRole: new Map([
        ['lean_protein', [poultry]],
        ['dairy', [{ ...casein, categoryName: 'dairy' }]],
      ]),
      proteinCategories: new Set(['meat', 'fish', 'dairy', 'eggs']),
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
