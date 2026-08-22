// Mirrors the exerciseCategoryEnum values in db/schema.ts exactly. Fixed
// set, not a DB-backed taxonomy table like Food Category/Subcategory/Role
// - Exercise.category is a compile-time enum (see knowledge/domain-model.md),
// so it's duplicated here the same way GENDERS/GOALS/ACTIVITY_LEVELS are
// duplicated in users/dto/create-user.dto.ts, not fetched via an extra
// taxonomy endpoint.
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
