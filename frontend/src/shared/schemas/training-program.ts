import * as z from 'zod';

// Mirrors backend/src/training-programs/dto/create-training-program.dto.ts
// (hand-synced, not derived) - client-side UX only; the backend DTO stays
// authoritative.
export const createTrainingProgramSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export type CreateTrainingProgramInput = z.infer<
  typeof createTrainingProgramSchema
>;

// Mirrors backend/src/training-programs/dto/add-program-exercise.dto.ts.
// Doesn't need the exercise category: AddProgramExerciseForm only ever
// renders one field group, so the submitted data alone determines
// validity. Enforced via superRefine rather than react-hook-form's
// `required` option, which zodResolver silently ignores.
export const addProgramExerciseSchema = z
  .object({
    exerciseId: z.uuid('Choose an exercise'),
    targetSets: z.number().int().min(1, 'Must be at least 1').optional(),
    targetReps: z.number().int().min(1, 'Must be at least 1').optional(),
    targetDurationSeconds: z
      .number()
      .int()
      .min(1, 'Must be at least 1')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetDurationSeconds != null) return;

    if (data.targetSets == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetSets'],
        message: 'Target sets is required',
      });
    }
    if (data.targetReps == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetReps'],
        message: 'Target reps is required',
      });
    }
  });

export type AddProgramExerciseInput = z.infer<typeof addProgramExerciseSchema>;
