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

// What a caller outside this module gets for a single Exercise: the
// display facts the program- and workout-set joins already project, and
// the category that decides whether a set carries reps or duration.
export interface ExerciseRef {
  id: string;
  name: string;
  category: ExerciseCategory;
  imageUrl: string | null;
}
