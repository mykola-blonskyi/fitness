import * as z from 'zod';

// Mirrors backend/src/training-programs/dto/create-training-program.dto.ts
// exactly - kept in sync by hand, not derived from it, same convention as
// shared/schemas/exercise.ts. The backend DTO stays authoritative; this
// is a client-side UX layer only, see docs/decisions.md.
export const createTrainingProgramSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export type CreateTrainingProgramInput = z.infer<
  typeof createTrainingProgramSchema
>;

// Mirrors backend/src/training-programs/dto/add-program-exercise.dto.ts.
// Whether targetSets/targetReps or targetDurationSeconds actually applies
// depends on the selected exercise's category, but the schema doesn't
// need that category at all: AddProgramExerciseForm only ever renders
// one of the two field groups (based on the selected exercise), so by
// submit time the data itself already tells the whole story - a
// duration alone is a complete target, sets+reps together are a complete
// target, anything else (neither, or a mix) is incomplete. The
// superRefine below enforces that self-contained rule the same way every
// other schema in this file enforces its own rules, rather than leaning
// on react-hook-form's separate `required` option.
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
