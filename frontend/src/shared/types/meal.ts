export const MEAL_TYPE_ORDER = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
] as const;
export type MealType = (typeof MEAL_TYPE_ORDER)[number];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
