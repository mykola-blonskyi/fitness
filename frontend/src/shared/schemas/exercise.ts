import * as z from 'zod';
import { EXERCISE_CATEGORIES } from '@shared/types/exercise';
import type { ValidationTranslator } from '@shared/schemas/validation-translator';

// Mirrors backend/src/exercises/dto/create-exercise.dto.ts by hand — the
// backend DTO stays authoritative, this is a client-side UX layer only.
export function createExerciseSchema(t: ValidationTranslator) {
  return z.object({
    name: z.string().min(1, t('exercise.nameRequired')),
    category: z.enum(EXERCISE_CATEGORIES, t('exercise.categoryRequired')),
  });
}

export type CreateExerciseInput = z.infer<
  ReturnType<typeof createExerciseSchema>
>;
