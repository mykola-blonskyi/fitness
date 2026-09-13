import type { DietMacroTotals } from './diet.types';

export interface DietItemMacroRow {
  weightGrams: string;
  caloriesPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
  isCounted: boolean;
}

export function sumCountedTotals(
  rows: readonly DietItemMacroRow[],
): DietMacroTotals {
  return rows
    .filter((row) => row.isCounted)
    .reduce(
      (totals, row) => {
        const factor = Number(row.weightGrams) / 100;
        return {
          calories: totals.calories + Number(row.caloriesPer100g) * factor,
          proteinG: totals.proteinG + Number(row.proteinPer100g) * factor,
          carbsG: totals.carbsG + Number(row.carbsPer100g) * factor,
          fatG: totals.fatG + Number(row.fatPer100g) * factor,
        };
      },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );
}
