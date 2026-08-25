import { BadRequestException } from '@nestjs/common';
import type { ExerciseCategory } from '../exercises/exercise.types';

export interface WorkoutSetValuesInput {
  weight?: number;
  reps?: number;
  durationSeconds?: number;
}

export interface WorkoutSetValues {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
}

// Mirrors program-exercise-targets.ts's resolveProgramExerciseTargets: a
// cardio-category exercise is logged by duration, every other category by
// weight/reps - never both, never neither.
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
    if (input.weight != null || input.reps != null) {
      throw new BadRequestException(
        'weight/reps do not apply to cardio exercises - use durationSeconds',
      );
    }
    return { weight: null, reps: null, durationSeconds: input.durationSeconds };
  }

  if (input.weight == null || input.reps == null) {
    throw new BadRequestException(
      'weight and reps are required for this exercise',
    );
  }
  if (input.durationSeconds != null) {
    throw new BadRequestException(
      'durationSeconds does not apply to this exercise - use weight/reps',
    );
  }
  return { weight: input.weight, reps: input.reps, durationSeconds: null };
}
