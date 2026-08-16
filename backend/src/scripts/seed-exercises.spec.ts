import {
  resolveArmsCategory,
  resolveCategory,
  type WgerExerciseInfo,
} from './seed-exercises';

function info(categoryId: number, muscleIds: number[] = []): WgerExerciseInfo {
  return {
    id: 1,
    category: { id: categoryId },
    muscles: muscleIds.map((id) => ({ id })),
    images: [],
    translations: [],
  };
}

describe('resolveArmsCategory', () => {
  it('maps the biceps brachii primary muscle to biceps', () => {
    expect(resolveArmsCategory([{ id: 1 }])).toBe('biceps');
  });

  it('maps the brachialis primary muscle to biceps', () => {
    expect(resolveArmsCategory([{ id: 13 }])).toBe('biceps');
  });

  it('maps the triceps brachii primary muscle to triceps', () => {
    expect(resolveArmsCategory([{ id: 5 }])).toBe('triceps');
  });

  it('returns null when no known arm muscle is present', () => {
    expect(resolveArmsCategory([{ id: 999 }])).toBeNull();
    expect(resolveArmsCategory([])).toBeNull();
  });
});

describe('resolveCategory', () => {
  it.each([
    [11, 'chest'],
    [12, 'back'],
    [13, 'shoulders'],
    [14, 'legs'],
    [9, 'legs'],
    [10, 'core'],
    [15, 'cardio'],
  ])('maps wger category %i directly to %s', (wgerCategoryId, expected) => {
    expect(resolveCategory(info(wgerCategoryId))).toBe(expected);
  });

  it('resolves Arms via the primary muscle', () => {
    expect(resolveCategory(info(8, [1]))).toBe('biceps');
    expect(resolveCategory(info(8, [5]))).toBe('triceps');
  });

  it('returns null for Arms with no resolvable muscle', () => {
    expect(resolveCategory(info(8, [999]))).toBeNull();
  });

  it('returns null for an unmapped wger category id', () => {
    expect(resolveCategory(info(9999))).toBeNull();
  });
});
