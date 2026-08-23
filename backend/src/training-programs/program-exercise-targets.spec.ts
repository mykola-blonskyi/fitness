import { BadRequestException } from '@nestjs/common';
import { resolveProgramExerciseTargets } from './program-exercise-targets';

describe('resolveProgramExerciseTargets', () => {
  it('accepts a duration for a cardio exercise', () => {
    expect(
      resolveProgramExerciseTargets('cardio', { targetDurationSeconds: 600 }),
    ).toEqual({
      targetSets: null,
      targetReps: null,
      targetDurationSeconds: 600,
    });
  });

  it('rejects a cardio exercise missing a duration', () => {
    expect(() => resolveProgramExerciseTargets('cardio', {})).toThrow(
      BadRequestException,
    );
  });

  it('rejects sets/reps supplied for a cardio exercise', () => {
    expect(() =>
      resolveProgramExerciseTargets('cardio', {
        targetDurationSeconds: 600,
        targetSets: 3,
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts sets/reps for a non-cardio exercise', () => {
    expect(
      resolveProgramExerciseTargets('chest', { targetSets: 3, targetReps: 10 }),
    ).toEqual({ targetSets: 3, targetReps: 10, targetDurationSeconds: null });
  });

  it('rejects a non-cardio exercise missing sets or reps', () => {
    expect(() =>
      resolveProgramExerciseTargets('chest', { targetSets: 3 }),
    ).toThrow(BadRequestException);
    expect(() =>
      resolveProgramExerciseTargets('chest', { targetReps: 10 }),
    ).toThrow(BadRequestException);
    expect(() => resolveProgramExerciseTargets('chest', {})).toThrow(
      BadRequestException,
    );
  });

  it('rejects a duration supplied for a non-cardio exercise', () => {
    expect(() =>
      resolveProgramExerciseTargets('chest', {
        targetSets: 3,
        targetReps: 10,
        targetDurationSeconds: 60,
      }),
    ).toThrow(BadRequestException);
  });
});
