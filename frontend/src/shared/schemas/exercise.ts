import * as z from 'zod';
import { EXERCISE_CATEGORIES } from '@shared/types/exercise';

// Mirrors backend/src/exercises/dto/create-exercise.dto.ts by hand — the
// backend DTO stays authoritative, this is a client-side UX layer only.
export const createExerciseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(EXERCISE_CATEGORIES, 'Choose a category'),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
