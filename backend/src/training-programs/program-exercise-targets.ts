import { BadRequestException } from '@nestjs/common';
import type { ExerciseCategory } from '../exercises/exercise.types';

export interface ProgramExerciseTargetsInput {
  targetSets?: number;
  targetReps?: number;
  targetDurationSeconds?: number;
}

export interface ProgramExerciseTargets {
  targetSets: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
}

// A cardio-category exercise is tracked by duration, every other category
// by sets/reps - never both, never neither (knowledge/domain-model.md's
// Exercise entity note).
export function resolveProgramExerciseTargets(
  category: ExerciseCategory,
  input: ProgramExerciseTargetsInput,
): ProgramExerciseTargets {
  if (category === 'cardio') {
    if (input.targetDurationSeconds == null) {
      throw new BadRequestException(
        'targetDurationSeconds is required for cardio exercises',
      );
    }
    if (input.targetSets != null || input.targetReps != null) {
      throw new BadRequestException(
        'targetSets/targetReps do not apply to cardio exercises - use targetDurationSeconds',
      );
    }
    return {
      targetSets: null,
      targetReps: null,
      targetDurationSeconds: input.targetDurationSeconds,
    };
  }

  if (input.targetSets == null || input.targetReps == null) {
    throw new BadRequestException(
      'targetSets and targetReps are required for this exercise',
    );
  }
  if (input.targetDurationSeconds != null) {
    throw new BadRequestException(
      'targetDurationSeconds does not apply to this exercise - use targetSets/targetReps',
    );
  }
  return {
    targetSets: input.targetSets,
    targetReps: input.targetReps,
    targetDurationSeconds: null,
  };
}
