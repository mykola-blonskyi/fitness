// See knowledge/domain-model.md "Diet Preference".
export const DIET_TYPES = ['vegetarian', 'vegan', 'keto', 'paleo'] as const;
export type DietType = (typeof DIET_TYPES)[number];
