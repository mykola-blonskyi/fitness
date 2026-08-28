import type { ExerciseCategory } from '@shared/types/exercise';
import type { Macros } from '@shared/types/food';

// Mirrors backend/src/admin/exercises/admin-exercise.mapper.ts's
// AdminExerciseResponse.
export interface AdminExercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  imageUrl: string | null;
  isVerified: boolean;
  source: string | null;
  sourceId: string | null;
  createdAt: string;
}

// Mirrors backend/src/admin/food-items/admin-food-item.mapper.ts's
// AdminFoodItemResponse.
export interface AdminFoodItem extends Macros {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  role: string;
  imageUrl: string | null;
  isVerified: boolean;
  source: string | null;
  sourceId: string | null;
  createdAt: string;
}

// Mirrors backend/src/admin/exercises/admin-exercises.service.ts's
// AdminExercisePage - generic so other admin cursor-paginated lists can
// reuse the same shape.
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
