// Mirrors backend/src/exercises/exercise.types.ts's EXERCISE_CATEGORIES -
// a fixed compile-time enum (see knowledge/domain-model.md), duplicated
// here the same way GENDERS/GOALS/ACTIVITY_LEVELS are duplicated in
// shared/types/user.ts, not fetched via an extra taxonomy endpoint.
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

// Display labels live in messages/*.json under ExerciseCategories, not
// here - see components using useTranslations/getTranslations('ExerciseCategories').

// Mirrors backend/src/exercises/exercise.mapper.ts's ExerciseResponse.
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  imageUrl: string | null;
  isVerified: boolean;
}
