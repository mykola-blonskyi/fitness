import {
  categoryNamesExcludedBy,
  proteinCategoriesFor,
  roleNamesExcludedBy,
} from './diet-preference-exclusions';

describe('categoryNamesExcludedBy', () => {
  it('returns an empty set for no active diet preferences', () => {
    expect(categoryNamesExcludedBy([])).toEqual(new Set());
  });

  it('excludes meat and fish for vegetarian', () => {
    expect(categoryNamesExcludedBy(['vegetarian'])).toEqual(
      new Set(['meat', 'fish']),
    );
  });

  it('additionally excludes dairy and eggs for vegan', () => {
    expect(categoryNamesExcludedBy(['vegan'])).toEqual(
      new Set(['meat', 'fish', 'dairy', 'eggs']),
    );
  });

  it('unions exclusions across multiple active diet preferences', () => {
    expect(categoryNamesExcludedBy(['keto', 'vegan'])).toEqual(
      new Set(['grains', 'legumes', 'meat', 'fish', 'dairy', 'eggs']),
    );
  });
});

describe('roleNamesExcludedBy', () => {
  it('returns an empty set when no active diet preference restricts roles', () => {
    expect(roleNamesExcludedBy(['vegetarian', 'paleo'])).toEqual(new Set());
  });

  it('excludes carb roles for keto', () => {
    expect(roleNamesExcludedBy(['keto'])).toEqual(
      new Set(['complex_carb', 'simple_carb']),
    );
  });
});

describe('proteinCategoriesFor', () => {
  it('offers an omnivore only the animal categories', () => {
    expect(proteinCategoriesFor([])).toEqual(
      new Set(['meat', 'fish', 'dairy', 'eggs']),
    );
  });

  it('adds legumes and nuts once meat and fish are gone', () => {
    expect(proteinCategoriesFor(['vegetarian'])).toEqual(
      new Set(['meat', 'fish', 'dairy', 'eggs', 'legumes', 'nuts']),
    );
  });

  it('leaves keto on animal protein, since it removes legumes not meat', () => {
    expect(proteinCategoriesFor(['keto'])).toEqual(
      new Set(['meat', 'fish', 'dairy', 'eggs']),
    );
  });
});
