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

// category is here because it decides whether a set carries reps or a
// duration, which every caller outside this module resolves before writing.
export interface ExerciseRef {
  id: string;
  name: string;
  category: ExerciseCategory;
  imageUrl: string | null;
}
