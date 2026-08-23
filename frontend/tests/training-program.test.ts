import { describe, expect, it } from 'vitest';
import {
  addProgramExerciseSchema,
  createTrainingProgramSchema,
} from '@shared/schemas/training-program';

describe('createTrainingProgramSchema', () => {
  it('accepts a non-empty title', () => {
    expect(
      createTrainingProgramSchema.safeParse({ title: 'Push/Pull/Legs' })
        .success,
    ).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(createTrainingProgramSchema.safeParse({ title: '' }).success).toBe(
      false,
    );
  });
});

describe('addProgramExerciseSchema', () => {
  const exerciseId = '11111111-1111-4111-8111-111111111111';

  it('accepts sets/reps for a non-cardio exercise', () => {
    expect(
      addProgramExerciseSchema.safeParse({
        exerciseId,
        targetSets: 3,
        targetReps: 10,
      }).success,
    ).toBe(true);
  });

  it('accepts a duration for a cardio exercise', () => {
    expect(
      addProgramExerciseSchema.safeParse({
        exerciseId,
        targetDurationSeconds: 600,
      }).success,
    ).toBe(true);
  });

  it('rejects a non-uuid exerciseId', () => {
    expect(
      addProgramExerciseSchema.safeParse({ exerciseId: 'not-a-uuid' }).success,
    ).toBe(false);
  });

  it('rejects a target below 1', () => {
    expect(
      addProgramExerciseSchema.safeParse({
        exerciseId,
        targetSets: 0,
        targetReps: 10,
      }).success,
    ).toBe(false);
  });

  it('rejects sets without reps', () => {
    expect(
      addProgramExerciseSchema.safeParse({ exerciseId, targetSets: 3 }).success,
    ).toBe(false);
  });

  it('rejects reps without sets', () => {
    expect(
      addProgramExerciseSchema.safeParse({ exerciseId, targetReps: 10 })
        .success,
    ).toBe(false);
  });

  it('rejects neither sets/reps nor a duration', () => {
    expect(addProgramExerciseSchema.safeParse({ exerciseId }).success).toBe(
      false,
    );
  });

  it('accepts a duration even when sets/reps are also absent', () => {
    // A duration alone is a complete, valid target - matches
    // AddProgramExerciseForm only ever rendering one field group at a
    // time, based on the selected exercise's category.
    expect(
      addProgramExerciseSchema.safeParse({
        exerciseId,
        targetDurationSeconds: 30,
      }).success,
    ).toBe(true);
  });
});
