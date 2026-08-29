import { describe, expect, it } from 'vitest';
import {
  logWorkoutSetSchema,
  startWorkoutLogSchema,
} from '@shared/schemas/workout-log';

describe('startWorkoutLogSchema', () => {
  const trainingProgramId = '11111111-1111-4111-8111-111111111111';

  it('accepts an empty body (ad hoc, no title)', () => {
    expect(startWorkoutLogSchema.safeParse({}).success).toBe(true);
  });

  it('accepts an empty-string trainingProgramId (the "ad hoc" select option)', () => {
    expect(
      startWorkoutLogSchema.safeParse({ trainingProgramId: '', title: '' })
        .success,
    ).toBe(true);
  });

  it('accepts a real trainingProgramId and title', () => {
    expect(
      startWorkoutLogSchema.safeParse({
        trainingProgramId,
        title: 'Push day',
      }).success,
    ).toBe(true);
  });

  it('rejects a non-uuid trainingProgramId', () => {
    expect(
      startWorkoutLogSchema.safeParse({ trainingProgramId: 'not-a-uuid' })
        .success,
    ).toBe(false);
  });
});

describe('logWorkoutSetSchema', () => {
  const exerciseId = '11111111-1111-4111-8111-111111111111';

  it('accepts weight/reps for a non-cardio exercise', () => {
    expect(
      logWorkoutSetSchema.safeParse({
        exerciseId,
        weight: 60,
        unit: 'kg',
        reps: 10,
      }).success,
    ).toBe(true);
  });

  it('accepts a duration for a cardio exercise', () => {
    expect(
      logWorkoutSetSchema.safeParse({ exerciseId, durationSeconds: 300 })
        .success,
    ).toBe(true);
  });

  it('rejects weight without reps', () => {
    expect(
      logWorkoutSetSchema.safeParse({ exerciseId, weight: 60 }).success,
    ).toBe(false);
  });

  it('rejects reps without weight', () => {
    expect(
      logWorkoutSetSchema.safeParse({ exerciseId, reps: 10 }).success,
    ).toBe(false);
  });

  it('rejects neither weight/reps nor a duration', () => {
    expect(logWorkoutSetSchema.safeParse({ exerciseId }).success).toBe(false);
  });
});
