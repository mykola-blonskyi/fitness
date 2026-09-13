import { isPreferenceExcluded, type SwapCandidateRow } from './swap-candidates';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';

function noExclusions(): ExclusionTargets {
  return {
    category: new Set(),
    subcategory: new Set(),
    role: new Set(),
    food_item: new Set(),
  };
}

const rows: SwapCandidateRow[] = [
  { id: 'a', categoryId: 'cat-1', subcategoryId: 'sub-1', roleId: 'role-1' },
  { id: 'b', categoryId: 'cat-2', subcategoryId: 'sub-2', roleId: 'role-1' },
  { id: 'c', categoryId: 'cat-1', subcategoryId: 'sub-3', roleId: 'role-1' },
];

describe('isPreferenceExcluded', () => {
  it('is false when no exclusion matches', () => {
    expect(isPreferenceExcluded(rows[0], noExclusions())).toBe(false);
  });

  it('is true when any of the four target types matches', () => {
    const exclusions = noExclusions();
    exclusions.subcategory.add('sub-1');
    expect(isPreferenceExcluded(rows[0], exclusions)).toBe(true);
  });

  it('excludes potato by category even though its role is now complex_carb', () => {
    const potato: SwapCandidateRow = {
      id: 'potato',
      categoryId: 'vegetables',
      subcategoryId: 'starchy-vegetables',
      roleId: 'complex-carb',
    };
    const exclusions = noExclusions();
    exclusions.category.add('vegetables');
    expect(isPreferenceExcluded(potato, exclusions)).toBe(true);
  });
});
