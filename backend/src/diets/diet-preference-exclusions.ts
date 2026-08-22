import type { DietType } from '../diet-preferences/diet-preference.types';

// Diet Preference (vegetarian/vegan/keto/paleo) -> Food Category/Food Role
// taxonomy nodes it excludes during generation - see
// knowledge/domain-model.md "Diet Preference": "used as an additional
// filter during diet generation". Neither the domain model nor
// knowledge/business-rules.md pins down which category/role names each
// diet type actually excludes - a real product decision, documented in
// docs/decisions.md ADR-011, not derivable from existing docs. Expressed
// at the same category/role granularity Food Preferences already use, so
// it merges directly into the same ExclusionTargets the candidate query
// in diets.service.ts filters against.
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
