import { sumCountedTotals, type DietItemMacroRow } from './diet-totals';

function row(overrides: Partial<DietItemMacroRow> = {}): DietItemMacroRow {
  return {
    weightGrams: '100',
    caloriesPer100g: '165',
    proteinPer100g: '31',
    carbsPer100g: '0',
    fatPer100g: '3.6',
    isCounted: true,
    ...overrides,
  };
}

describe('sumCountedTotals', () => {
  it('scales each counted row by its weight', () => {
    const totals = sumCountedTotals([row(), row({ weightGrams: '200' })]);

    expect(totals.calories).toBeCloseTo(495);
    expect(totals.proteinG).toBeCloseTo(93);
    expect(totals.fatG).toBeCloseTo(10.8);
  });

  it('leaves a free item out, macros and all', () => {
    const free = row({
      weightGrams: '80',
      caloriesPer100g: '25',
      proteinPer100g: '2',
      carbsPer100g: '5',
      fatPer100g: '0.3',
      isCounted: false,
    });

    expect(sumCountedTotals([row(), free])).toEqual(sumCountedTotals([row()]));
  });

  it('returns zeroes for a diet of nothing but free items', () => {
    const totals = sumCountedTotals([row({ isCounted: false })]);

    expect(totals).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});
