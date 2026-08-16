import { describe, expect, it } from 'vitest';
import { weightSchema } from '@shared/schemas/weight';
import { firstFieldErrors } from '@shared/schemas/zod-errors';

describe('weightSchema', () => {
  it('accepts a valid weight', () => {
    const result = weightSchema.safeParse({ weight: 72.5 });
    expect(result.success).toBe(true);
  });

  it.each([0, -1, -0.1])('rejects a non-positive weight (%s)', (weight) => {
    const result = weightSchema.safeParse({ weight });
    expect(result.success).toBe(false);
  });

  it('rejects a missing weight', () => {
    const result = weightSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric weight', () => {
    const result = weightSchema.safeParse({ weight: 'not a number' });
    expect(result.success).toBe(false);
  });
});

describe('firstFieldErrors', () => {
  it('maps a schema failure to one message per field', () => {
    const result = weightSchema.safeParse({ weight: -5 });
    if (result.success) throw new Error('expected failure');
    const errors = firstFieldErrors(result.error);
    expect(Object.keys(errors)).toEqual(['weight']);
    expect(errors.weight).toBeTruthy();
  });
});
