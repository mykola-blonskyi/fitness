import { BadRequestException } from '@nestjs/common';
import type { ExerciseCategory } from '../exercises/exercise.types';
import { assertRealisticWeight, type WeightUnit } from '../shared/weight-unit';

export interface WorkoutSetValuesInput {
  weight?: number;
  unit?: WeightUnit;
  reps?: number;
  durationSeconds?: number;
}

export interface WorkoutSetValues {
  weight: number | null;
  weightUnit: WeightUnit | null;
  reps: number | null;
  durationSeconds: number | null;
}

// Mirrors program-exercise-targets.ts's resolveProgramExerciseTargets: a
// cardio-category exercise is logged by duration, every other category by
// weight/reps - never both, never neither. unit follows weight (required
// together, forbidden together with durationSeconds).
export function resolveWorkoutSetValues(
  category: ExerciseCategory,
  input: WorkoutSetValuesInput,
): WorkoutSetValues {
  if (category === 'cardio') {
    if (input.durationSeconds == null) {
      throw new BadRequestException(
        'durationSeconds is required for cardio exercises',
      );
    }
    if (input.weight != null || input.reps != null || input.unit != null) {
      throw new BadRequestException(
        'weight/unit/reps do not apply to cardio exercises - use durationSeconds',
      );
    }
    return {
      weight: null,
      weightUnit: null,
      reps: null,
      durationSeconds: input.durationSeconds,
    };
  }

  if (input.weight == null || input.unit == null || input.reps == null) {
    throw new BadRequestException(
      'weight, unit, and reps are required for this exercise',
    );
  }
  if (input.durationSeconds != null) {
    throw new BadRequestException(
      'durationSeconds does not apply to this exercise - use weight/reps',
    );
  }
  assertRealisticWeight(input.weight, input.unit);
  return {
    weight: input.weight,
    weightUnit: input.unit,
    reps: input.reps,
    durationSeconds: null,
  };
}
