import { BadRequestException } from '@nestjs/common';
import {
  assertRealisticBodyWeight,
  assertRealisticWeight,
  convertWeight,
} from './weight-unit';

describe('assertRealisticWeight', () => {
  it('allows a light workout-set weight with no floor', () => {
    expect(() => assertRealisticWeight(0.5, 'kg')).not.toThrow();
  });

  it('rejects a weight above the ceiling', () => {
    expect(() => assertRealisticWeight(501, 'kg')).toThrow(BadRequestException);
    expect(() => assertRealisticWeight(1101, 'lb')).toThrow(
      BadRequestException,
    );
  });
});

describe('assertRealisticBodyWeight', () => {
  it('allows a realistic body weight', () => {
    expect(() => assertRealisticBodyWeight(72.5, 'kg')).not.toThrow();
  });

  it('rejects a weight below the floor', () => {
    expect(() => assertRealisticBodyWeight(0.5, 'kg')).toThrow(
      BadRequestException,
    );
    expect(() => assertRealisticBodyWeight(19.9, 'kg')).toThrow(
      BadRequestException,
    );
    expect(() => assertRealisticBodyWeight(43.9, 'lb')).toThrow(
      BadRequestException,
    );
  });

  it('rejects a weight above the ceiling', () => {
    expect(() => assertRealisticBodyWeight(501, 'kg')).toThrow(
      BadRequestException,
    );
  });
});

describe('convertWeight', () => {
  it('returns the value unchanged when the units match', () => {
    expect(convertWeight(72.5, 'kg', 'kg')).toBe(72.5);
    expect(convertWeight(160, 'lb', 'lb')).toBe(160);
  });

  it('converts kg to lb', () => {
    expect(convertWeight(100, 'kg', 'lb')).toBeCloseTo(220.462, 3);
  });

  it('converts lb to kg', () => {
    expect(convertWeight(220.462, 'lb', 'kg')).toBeCloseTo(100, 3);
  });

  it('round-trips within floating-point tolerance', () => {
    const kg = 83.4;
    expect(
      convertWeight(convertWeight(kg, 'kg', 'lb'), 'lb', 'kg'),
    ).toBeCloseTo(kg, 10);
  });
});
