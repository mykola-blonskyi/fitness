import { BadRequestException } from '@nestjs/common';
import { resolveWorkoutSetValues } from './workout-set-values';

describe('resolveWorkoutSetValues', () => {
  it('accepts a duration for a cardio exercise', () => {
    expect(resolveWorkoutSetValues('cardio', { durationSeconds: 300 })).toEqual(
      { weight: null, reps: null, durationSeconds: 300 },
    );
  });

  it('rejects a cardio exercise missing a duration', () => {
    expect(() => resolveWorkoutSetValues('cardio', {})).toThrow(
      BadRequestException,
    );
  });

  it('rejects weight/reps supplied for a cardio exercise', () => {
    expect(() =>
      resolveWorkoutSetValues('cardio', { durationSeconds: 300, reps: 10 }),
    ).toThrow(BadRequestException);
  });

  it('accepts weight/reps for a non-cardio exercise', () => {
    expect(resolveWorkoutSetValues('chest', { weight: 60, reps: 10 })).toEqual({
      weight: 60,
      reps: 10,
      durationSeconds: null,
    });
  });

  it('rejects a non-cardio exercise missing weight or reps', () => {
    expect(() => resolveWorkoutSetValues('chest', { weight: 60 })).toThrow(
      BadRequestException,
    );
    expect(() => resolveWorkoutSetValues('chest', { reps: 10 })).toThrow(
      BadRequestException,
    );
    expect(() => resolveWorkoutSetValues('chest', {})).toThrow(
      BadRequestException,
    );
  });

  it('rejects a duration supplied for a non-cardio exercise', () => {
    expect(() =>
      resolveWorkoutSetValues('chest', {
        weight: 60,
        reps: 10,
        durationSeconds: 60,
      }),
    ).toThrow(BadRequestException);
  });
});
