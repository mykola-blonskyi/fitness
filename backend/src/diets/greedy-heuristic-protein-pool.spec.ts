import { generateDietItems } from './greedy-heuristic';
import type { FoodCandidate } from './diet.types';

const eggProtein: FoodCandidate = {
  id: 'eggs',
  caloriesPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
  familyName: 'eggs',
  categoryName: 'eggs',
};
const lentils: FoodCandidate = {
  id: 'lentils',
  caloriesPer100g: 120,
  proteinPer100g: 25,
  carbsPer100g: 20,
  fatPer100g: 1,
  familyName: 'legume_protein',
  categoryName: 'legumes',
};

const ANIMAL = new Set(['meat', 'fish', 'dairy', 'eggs']);
const ANIMAL_AND_PLANT = new Set([...ANIMAL, 'legumes', 'nuts']);

function proteinPoolOffered(
  proteinCategories: ReadonlySet<string>,
): string[] | undefined {
  const offered: string[][] = [];
  generateDietItems({
    targetCalories: 1500,
    targetProteinG: 120,
    targetCarbsG: 0,
    targetFatG: 40,
    mealCount: 1,
    candidatesByRole: new Map([
      ['lean_protein', [eggProtein]],
      ['plant_protein', [lentils]],
    ]),
    proteinCategories,
    pickRandom: (items) => {
      offered.push(items.map((item) => item.id));
      return items[0];
    },
  });
  return offered[0];
}

describe('generateDietItems - the protein pool (ADR-023)', () => {
  it('keeps legumes out of an omnivore protein slot', () => {
    expect(proteinPoolOffered(ANIMAL)).toEqual([eggProtein.id]);
  });

  it('offers legumes alongside eggs once a diet type has removed meat and fish', () => {
    expect(proteinPoolOffered(ANIMAL_AND_PLANT)).toEqual([
      eggProtein.id,
      lentils.id,
    ]);
  });
});
