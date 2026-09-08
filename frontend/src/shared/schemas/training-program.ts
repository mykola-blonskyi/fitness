import * as z from 'zod';
import { blankToUndefined } from '@shared/schemas/preprocess';
import type { ValidationTranslator } from '@shared/schemas/validation-translator';

// Mirrors backend/src/training-programs/dto/create-training-program.dto.ts
// (hand-synced, not derived) - client-side UX only; the backend DTO stays
// authoritative.
export function createTrainingProgramSchema(t: ValidationTranslator) {
  return z.object({
    title: z.string().min(1, t('trainingProgram.titleRequired')),
  });
}

export type CreateTrainingProgramInput = z.infer<
  ReturnType<typeof createTrainingProgramSchema>
>;

// Mirrors backend/src/training-programs/dto/add-program-exercise.dto.ts.
// Doesn't need the exercise category: AddProgramExerciseForm only ever
// renders one field group, so the submitted data alone determines
// validity. Enforced via superRefine rather than react-hook-form's
// `required` option, which zodResolver silently ignores.
export function addProgramExerciseSchema(t: ValidationTranslator) {
  return z
    .object({
      exerciseId: z.uuid(t('programExercise.exerciseRequired')),
      targetSets: z.preprocess(
        blankToUndefined,
        z.number().int().min(1, t('programExercise.targetMin')).optional(),
      ),
      targetReps: z.preprocess(
        blankToUndefined,
        z.number().int().min(1, t('programExercise.targetMin')).optional(),
      ),
      targetDurationSeconds: z.preprocess(
        blankToUndefined,
        z.number().int().min(1, t('programExercise.targetMin')).optional(),
      ),
    })
    .superRefine((data, ctx) => {
      if (data.targetDurationSeconds != null) return;

      if (data.targetSets == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['targetSets'],
          message: t('programExercise.targetSetsRequired'),
        });
      }
      if (data.targetReps == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['targetReps'],
          message: t('programExercise.targetRepsRequired'),
        });
      }
    });
}

export type AddProgramExerciseInput = z.infer<
  ReturnType<typeof addProgramExerciseSchema>
>;
