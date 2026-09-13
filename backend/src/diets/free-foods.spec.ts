import { freeFoodGrams, isFreeFood } from './free-foods';

describe('free foods', () => {
  it('serves a salad or cooked vegetable at its nominal portion', () => {
    expect(freeFoodGrams('salad_vegetable')).toBe(80);
    expect(freeFoodGrams('cooked_vegetable')).toBe(80);
  });

  it('counts a vegetable Family that is not on the allowlist', () => {
    expect(isFreeFood('starchy_vegetable')).toBe(false);
    expect(isFreeFood('fatty_fruit')).toBe(false);
    expect(freeFoodGrams('starchy_vegetable')).toBeNull();
  });

  it('counts a Food Item with no Family at all', () => {
    expect(isFreeFood(null)).toBe(false);
    expect(freeFoodGrams(null)).toBeNull();
  });

  it('counts a family name outside the taxonomy', () => {
    expect(isFreeFood('not_a_family')).toBe(false);
  });
});
