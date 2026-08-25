import { BadRequestException } from '@nestjs/common';
import { assertValidDate } from './date';

describe('assertValidDate', () => {
  it('accepts a well-formed date', () => {
    expect(() => assertValidDate('2026-08-25')).not.toThrow();
  });

  it('rejects a malformed date', () => {
    expect(() => assertValidDate('08/25/2026')).toThrow(BadRequestException);
  });

  it('rejects a non-date string', () => {
    expect(() => assertValidDate('not-a-date')).toThrow(BadRequestException);
  });
});
