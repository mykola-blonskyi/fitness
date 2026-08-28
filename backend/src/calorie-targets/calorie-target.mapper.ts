import { dietCalculationAlgorithms } from '../db/schema';
import type { WeightUnit } from '../shared/weight-unit';
import type { MifflinV1Result } from './algorithms/mifflin-v1';

export type DietCalculationAlgorithmRow =
  typeof dietCalculationAlgorithms.$inferSelect;

export interface CalorieTargetResponse {
  algorithm: {
    code: string;
    name: string;
    description: string;
    formula: string;
  };
  weighIn: {
    weight: number;
    unit: WeightUnit;
    date: string;
  };
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function toCalorieTargetResponse(
  algorithm: DietCalculationAlgorithmRow,
  weighIn: { weight: number; unit: WeightUnit; date: string },
  result: MifflinV1Result,
): CalorieTargetResponse {
  return {
    algorithm: {
      code: algorithm.code,
      name: algorithm.name,
      description: algorithm.description,
      formula: algorithm.formula,
    },
    weighIn,
    calories: result.calories,
    proteinG: result.proteinG,
    carbsG: result.carbsG,
    fatG: result.fatG,
  };
}
