import { mealSlotsForCount } from './diet.types';

describe('mealSlotsForCount', () => {
  it('returns one slot per mealType, occurrence 1, when count is within MEAL_TYPES.length', () => {
    expect(mealSlotsForCount(3)).toEqual([
      { mealType: 'breakfast', occurrence: 1 },
      { mealType: 'lunch', occurrence: 1 },
      { mealType: 'dinner', occurrence: 1 },
    ]);
  });

  it('round-robins past 4, incrementing occurrence per repeat of the same mealType', () => {
    expect(mealSlotsForCount(6)).toEqual([
      { mealType: 'breakfast', occurrence: 1 },
      { mealType: 'lunch', occurrence: 1 },
      { mealType: 'dinner', occurrence: 1 },
      { mealType: 'snack', occurrence: 1 },
      { mealType: 'breakfast', occurrence: 2 },
      { mealType: 'lunch', occurrence: 2 },
    ]);
  });

  it('returns an empty list for a count of 0', () => {
    expect(mealSlotsForCount(0)).toEqual([]);
  });
});
