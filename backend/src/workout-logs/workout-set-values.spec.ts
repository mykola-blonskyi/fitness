import { BadRequestException } from '@nestjs/common';
import { resolveWorkoutSetValues } from './workout-set-values';

describe('resolveWorkoutSetValues', () => {
  it('accepts a duration for a cardio exercise', () => {
    expect(resolveWorkoutSetValues('cardio', { durationSeconds: 300 })).toEqual(
      { weight: null, weightUnit: null, reps: null, durationSeconds: 300 },
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

  it('accepts weight/unit/reps for a non-cardio exercise', () => {
    expect(
      resolveWorkoutSetValues('chest', { weight: 60, unit: 'kg', reps: 10 }),
    ).toEqual({
      weight: 60,
      weightUnit: 'kg',
      reps: 10,
      durationSeconds: null,
    });
  });

  it('rejects a non-cardio exercise missing weight, unit, or reps', () => {
    expect(() =>
      resolveWorkoutSetValues('chest', { weight: 60, unit: 'kg' }),
    ).toThrow(BadRequestException);
    expect(() =>
      resolveWorkoutSetValues('chest', { weight: 60, reps: 10 }),
    ).toThrow(BadRequestException);
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
        unit: 'kg',
        reps: 10,
        durationSeconds: 60,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a weight above the realistic max for the given unit', () => {
    expect(() =>
      resolveWorkoutSetValues('chest', { weight: 501, unit: 'kg', reps: 10 }),
    ).toThrow(BadRequestException);
    expect(() =>
      resolveWorkoutSetValues('chest', { weight: 1101, unit: 'lb', reps: 10 }),
    ).toThrow(BadRequestException);
  });
});
