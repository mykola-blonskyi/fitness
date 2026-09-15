import { generateDietItems } from './greedy-heuristic';
import type { FoodCandidate } from './diet.types';

const protein: FoodCandidate = {
  id: 'chicken',
  caloriesPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
  familyName: 'poultry',
  categoryName: 'meat',
};

// Carries none of the macro its Role promises, which is what empties a
// chain-tail role in production.
const carblessCarb: FoodCandidate = {
  id: 'mis-roled',
  caloriesPer100g: 30,
  proteinPer100g: 5,
  carbsPer100g: 0,
  fatPer100g: 1,
  familyName: 'grain_garnish',
  categoryName: 'grains',
};

const rice: FoodCandidate = {
  id: 'rice',
  caloriesPer100g: 350,
  proteinPer100g: 7,
  carbsPer100g: 78,
  fatPer100g: 1,
  familyName: 'grain_garnish',
  categoryName: 'grains',
};

describe('generateDietItems - a role with no eligible candidate falls through', () => {
  it('reaches simple_carb when complex_carb can carry no carbohydrate', () => {
    const result = generateDietItems({
      targetCalories: 1500,
      targetProteinG: 120,
      targetCarbsG: 100,
      targetFatG: 40,
      mealCount: 1,
      candidatesByRole: new Map([
        ['lean_protein', [protein]],
        ['complex_carb', [carblessCarb]],
        ['simple_carb', [rice]],
      ]),
      pickRandom: (items) => items[0],
    });

    expect(result.items.map((item) => item.foodItemId)).toContain(rice.id);
  });
});
