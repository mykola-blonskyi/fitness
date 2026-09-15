import type { DietType } from '../diet-preferences/diet-preference.types';

// Which category/role names each diet type excludes is a product decision
// not derivable from the domain docs - see docs/decisions.md ADR-011.
export const DIET_TYPE_CATEGORY_EXCLUSIONS: Record<
  DietType,
  readonly string[]
> = {
  vegetarian: ['meat', 'fish'],
  // Lacto-ovo vegetarian - dairy/eggs stay allowed, only meat/fish excluded.
  vegan: ['meat', 'fish', 'dairy', 'eggs'],
  keto: ['grains', 'legumes'],
  paleo: ['grains', 'legumes', 'dairy'],
};

export const DIET_TYPE_ROLE_EXCLUSIONS: Record<DietType, readonly string[]> = {
  vegetarian: [],
  vegan: [],
  keto: ['complex_carb', 'simple_carb'],
  paleo: [],
};

export function categoryNamesExcludedBy(
  dietTypes: readonly DietType[],
): Set<string> {
  const names = new Set<string>();
  for (const dietType of dietTypes) {
    for (const name of DIET_TYPE_CATEGORY_EXCLUSIONS[dietType]) {
      names.add(name);
    }
  }
  return names;
}

// Legumes and nuts join the protein slot only once a diet type has removed
// meat or fish, so an omnivore is never served lentils as a main (ADR-023).
const ANIMAL_PROTEIN_CATEGORIES = ['meat', 'fish', 'dairy', 'eggs'];
const PLANT_PROTEIN_CATEGORIES = ['legumes', 'nuts'];

export function proteinCategoriesFor(
  dietTypes: readonly DietType[],
): Set<string> {
  const excluded = categoryNamesExcludedBy(dietTypes);
  const names = new Set(ANIMAL_PROTEIN_CATEGORIES);
  if (excluded.has('meat') || excluded.has('fish')) {
    for (const name of PLANT_PROTEIN_CATEGORIES) names.add(name);
  }
  return names;
}

export function roleNamesExcludedBy(
  dietTypes: readonly DietType[],
): Set<string> {
  const names = new Set<string>();
  for (const dietType of dietTypes) {
    for (const name of DIET_TYPE_ROLE_EXCLUSIONS[dietType]) {
      names.add(name);
    }
  }
  return names;
}
