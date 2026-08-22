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

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
  full_body: 'Full body',
};

// Mirrors backend/src/exercises/exercise.mapper.ts's ExerciseResponse.
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  imageUrl: string | null;
  isVerified: boolean;
}
