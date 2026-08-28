import * as z from 'zod';
import { WEIGHT_UNITS } from '@shared/types/user';
import { MAX_KG, MAX_LB } from '@shared/constants/weight-unit';

// Mirrors backend/src/workout-logs/dto/start-workout-log.dto.ts. Both
// fields come from a <select>/<input> that can submit '' for "not set" -
// preprocessed to undefined so the optional() checks below actually apply.
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

export const startWorkoutLogSchema = z.object({
  trainingProgramId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  title: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export type StartWorkoutLogInput = z.infer<typeof startWorkoutLogSchema>;

// Mirrors backend/src/workout-logs/dto/log-workout-set.dto.ts. Enforced via
// superRefine rather than react-hook-form's `required` option, which
// zodResolver silently ignores - same reasoning as addProgramExerciseSchema.
export const logWorkoutSetSchema = z
  .object({
    exerciseId: z.uuid('Choose an exercise'),
    weight: z.number().min(0.1, 'Must be greater than 0').optional(),
    unit: z.enum(WEIGHT_UNITS).optional(),
    reps: z.number().int().min(1, 'Must be at least 1').optional(),
    durationSeconds: z.number().int().min(1, 'Must be at least 1').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.durationSeconds != null) return;

    if (data.weight == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['weight'],
        message: 'Weight is required',
      });
    } else if (data.weight > (data.unit === 'lb' ? MAX_LB : MAX_KG)) {
      ctx.addIssue({
        code: 'custom',
        path: ['weight'],
        message: `Weight must be at most ${MAX_KG}kg (${MAX_LB}lb)`,
      });
    }
    if (data.unit == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['unit'],
        message: 'Unit is required',
      });
    }
    if (data.reps == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['reps'],
        message: 'Reps is required',
      });
    }
  });

export type LogWorkoutSetInput = z.infer<typeof logWorkoutSetSchema>;
