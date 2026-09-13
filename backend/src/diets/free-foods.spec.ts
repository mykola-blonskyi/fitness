import { freeFoodGrams, freeFoodPortion, isFreeFood } from './free-foods';

describe('free foods', () => {
  it('serves a salad or cooked vegetable at the bulk portion', () => {
    expect(freeFoodGrams('salad_vegetable')).toBe(80);
    expect(freeFoodPortion('salad_vegetable')).toBe('bulk');
    expect(freeFoodGrams('cooked_vegetable')).toBe(80);
    expect(freeFoodPortion('cooked_vegetable')).toBe('bulk');
  });

  it('serves an accent vegetable at the accent portion', () => {
    expect(freeFoodGrams('accent_vegetable')).toBe(15);
    expect(freeFoodPortion('accent_vegetable')).toBe('accent');
  });

  it('counts a vegetable Family that is not on the allowlist', () => {
    expect(isFreeFood('starchy_vegetable')).toBe(false);
    expect(isFreeFood('fatty_fruit')).toBe(false);
    expect(freeFoodGrams('starchy_vegetable')).toBeNull();
    expect(freeFoodPortion('starchy_vegetable')).toBeNull();
  });

  it('counts a Food Item with no Family at all', () => {
    expect(isFreeFood(null)).toBe(false);
    expect(freeFoodGrams(null)).toBeNull();
    expect(freeFoodPortion(null)).toBeNull();
  });

  it('counts a family name outside the taxonomy', () => {
    expect(isFreeFood('not_a_family')).toBe(false);
    expect(freeFoodPortion('not_a_family')).toBeNull();
  });
});
