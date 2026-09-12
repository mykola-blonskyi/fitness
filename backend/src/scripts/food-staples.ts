// Curated staples set (ADR-020 phase 1): a hand-authored pool guaranteeing
// every Food Family has members to generate from, independent of what the
// OFF/USDA/RU imports happened to classify.
import {
  isFoodFamily,
  type FoodFamily,
  type Macros,
} from '../food-items/food-item.types';
import staples from './data/food-staples.json';

export const CURATED_SOURCE = 'curated_staples';

export const STAPLE_LOCALES = ['uk', 'ru', 'es'] as const;

export interface StapleFood extends Macros {
  sourceId: string;
  family: FoodFamily;
  category: string;
  subcategory: string;
  role: string;
  names: { en: string; uk: string; ru: string; es: string };
}

interface RawStapleFood extends Omit<StapleFood, 'family'> {
  family: string;
}

export const STAPLES: StapleFood[] = (staples as RawStapleFood[]).map(
  (staple) => {
    if (!isFoodFamily(staple.family))
      throw new Error(
        `data/food-staples.json: "${staple.sourceId}" names an unknown family "${staple.family}".`,
      );
    return { ...staple, family: staple.family };
  },
);

export const STAPLE_FAMILIES: Record<string, FoodFamily> = Object.fromEntries(
  STAPLES.map((staple) => [staple.sourceId, staple.family]),
);
