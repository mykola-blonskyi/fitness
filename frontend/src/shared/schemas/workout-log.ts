import * as z from 'zod';
import { WEIGHT_UNITS } from '@shared/types/user';
import { MAX_KG, MAX_LB } from '@shared/constants/weight-unit';
import { blankToUndefined } from '@shared/schemas/preprocess';
import type { ValidationTranslator } from '@shared/schemas/validation-translator';

// Mirrors backend/src/workout-logs/dto/start-workout-log.dto.ts. Both
// fields come from a <select>/<input> that can submit '' for "not set" -
// preprocessed to undefined so the optional() checks below actually apply.
export function startWorkoutLogSchema() {
  return z.object({
    trainingProgramId: z.preprocess(blankToUndefined, z.uuid().optional()),
    title: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  });
}

export type StartWorkoutLogInput = z.infer<
  ReturnType<typeof startWorkoutLogSchema>
>;

// Mirrors backend/src/workout-logs/dto/log-workout-set.dto.ts. Enforced via
// superRefine rather than react-hook-form's `required` option, which
// zodResolver silently ignores - same reasoning as addProgramExerciseSchema.
export function logWorkoutSetSchema(t: ValidationTranslator) {
  return z
    .object({
      exerciseId: z.uuid(t('workoutSet.exerciseRequired')),
      weight: z.preprocess(
        blankToUndefined,
        z.number().min(0.1, t('workoutSet.weightMin')).optional(),
      ),
      unit: z.preprocess(blankToUndefined, z.enum(WEIGHT_UNITS).optional()),
      reps: z.preprocess(
        blankToUndefined,
        z.number().int().min(1, t('workoutSet.repsMin')).optional(),
      ),
      durationSeconds: z.preprocess(
        blankToUndefined,
        z.number().int().min(1, t('workoutSet.durationMin')).optional(),
      ),
    })
    .superRefine((data, ctx) => {
      if (data.durationSeconds != null) return;

      if (data.weight == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['weight'],
          message: t('workoutSet.weightRequired'),
        });
      } else if (data.weight > (data.unit === 'lb' ? MAX_LB : MAX_KG)) {
        ctx.addIssue({
          code: 'custom',
          path: ['weight'],
          message: t('workoutSet.weightMaxExceeded', {
            maxKg: MAX_KG,
            maxLb: MAX_LB,
          }),
        });
      }
      if (data.unit == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['unit'],
          message: t('workoutSet.unitRequired'),
        });
      }
      if (data.reps == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['reps'],
          message: t('workoutSet.repsRequired'),
        });
      }
    });
}

export type LogWorkoutSetInput = z.infer<
  ReturnType<typeof logWorkoutSetSchema>
>;
