import type { ExerciseCategory } from './exercise.types';

export interface ExerciseResponse {
  id: string;
  name: string;
  category: ExerciseCategory;
  imageUrl: string | null;
  isVerified: boolean;
}

// Shape of the plain select() projection list()/create() query - name is
// whatever the caller already resolved (translated or base English, see
// exercises.service.ts's list()).
export interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  isVerified: boolean;
}

export function toExerciseResponse(row: ExerciseRow): ExerciseResponse {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    imageUrl: row.imageUrl,
    isVerified: row.isVerified,
  };
}
