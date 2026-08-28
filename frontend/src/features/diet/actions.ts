import type { WeightUnit } from '@shared/types/user';

// Mirrors backend/src/calorie-targets/calorie-target.mapper.ts's
// CalorieTargetResponse. No Server Action here yet (a pure read, same
// as daily-log/actions.ts's DailyLog type before setWeight/clearWeight
// existed) - FITNESS-30 (diet generation) is the next ticket expected to
// add real mutations (regenerate, swap) to this same file.
export interface CalorieTarget {
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
