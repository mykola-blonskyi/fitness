import { describe, expect, it } from 'vitest';
import { userProfileSchema } from '@shared/schemas/user-profile';

const valid = {
  name: 'Verify Test',
  gender: 'male',
  dateOfBirth: '1990-06-15',
  height: 180,
  goal: 'weight_loss',
  activityLevel: 'sedentary',
  locale: 'en',
};

describe('userProfileSchema', () => {
  it('accepts a fully valid profile', () => {
    expect(userProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = userProfileSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid gender', () => {
    const result = userProfileSchema.safeParse({
      ...valid,
      gender: 'other',
    });
    expect(result.success).toBe(false);
  });

  it.each(['1990-6-15', '1990-01-32', 'not-a-date'])(
    'rejects a malformed date of birth (%s)',
    (dateOfBirth) => {
      const result = userProfileSchema.safeParse({ ...valid, dateOfBirth });
      expect(result.success).toBe(false);
    },
  );

  it.each([29, 301])('rejects an out-of-range height (%s)', (height) => {
    const result = userProfileSchema.safeParse({ ...valid, height });
    expect(result.success).toBe(false);
  });

  it.each([30, 300])('accepts height at the boundary (%s)', (height) => {
    const result = userProfileSchema.safeParse({ ...valid, height });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid goal', () => {
    const result = userProfileSchema.safeParse({ ...valid, goal: 'bulk' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid activity level', () => {
    const result = userProfileSchema.safeParse({
      ...valid,
      activityLevel: 'extreme',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid locale', () => {
    const result = userProfileSchema.safeParse({
      ...valid,
      locale: 'fr',
    });
    expect(result.success).toBe(false);
  });
});
