import type { DietType } from './diet-preference.types';

export interface DietPreferenceResponse {
  id: string;
  dietType: DietType;
}

export interface DietPreferenceRow {
  id: string;
  dietType: DietType;
}

export function toDietPreferenceResponse(
  row: DietPreferenceRow,
): DietPreferenceResponse {
  return { id: row.id, dietType: row.dietType };
}
