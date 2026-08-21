import { describe, expect, it } from 'vitest';
import {
  createDietPreferenceSchema,
  createFoodPreferenceSchema,
} from '@shared/schemas/preferences';

const validFoodPreference = {
  type: 'exclude',
  targetType: 'category',
  targetId: '11111111-1111-4111-8111-111111111111',
};

describe('createFoodPreferenceSchema', () => {
  it('accepts a fully valid food preference', () => {
    expect(
      createFoodPreferenceSchema.safeParse(validFoodPreference).success,
    ).toBe(true);
  });

  it('rejects an invalid type', () => {
    const result = createFoodPreferenceSchema.safeParse({
      ...validFoodPreference,
      type: 'dislike',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid targetType', () => {
    const result = createFoodPreferenceSchema.safeParse({
      ...validFoodPreference,
      targetType: 'ingredient',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid targetId', () => {
    const result = createFoodPreferenceSchema.safeParse({
      ...validFoodPreference,
      targetId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('createDietPreferenceSchema', () => {
  it.each(['vegetarian', 'vegan', 'keto', 'paleo'])(
    'accepts %s as a diet type',
    (dietType) => {
      expect(createDietPreferenceSchema.safeParse({ dietType }).success).toBe(
        true,
      );
    },
  );

  it('rejects an invalid diet type', () => {
    const result = createDietPreferenceSchema.safeParse({
      dietType: 'carnivore',
    });
    expect(result.success).toBe(false);
  });
});
