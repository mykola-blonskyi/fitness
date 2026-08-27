import type { ExerciseCategory } from '../../exercises/exercise.types';

export interface AdminExerciseResponse {
  id: string;
  name: string;
  category: ExerciseCategory;
  imageUrl: string | null;
  isVerified: boolean;
  source: string | null;
  sourceId: string | null;
  createdAt: string;
}

export interface AdminExerciseRow {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  isVerified: boolean;
  source: string | null;
  sourceId: string | null;
  createdAt: Date;
}

export function toAdminExerciseResponse(
  row: AdminExerciseRow,
): AdminExerciseResponse {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    imageUrl: row.imageUrl,
    isVerified: row.isVerified,
    source: row.source,
    sourceId: row.sourceId,
    createdAt: row.createdAt.toISOString(),
  };
}
