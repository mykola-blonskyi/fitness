import { convertWeight } from './weight-unit';

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
