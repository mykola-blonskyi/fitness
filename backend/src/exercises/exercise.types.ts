// Must mirror exerciseCategoryEnum in db/schema.ts exactly — a fixed enum,
// not a DB-backed taxonomy table, so it's duplicated here rather than fetched.
export const EXERCISE_CATEGORIES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'core',
  'cardio',
  'full_body',
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
