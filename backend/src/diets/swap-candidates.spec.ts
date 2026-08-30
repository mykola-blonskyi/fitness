import {
  eligibleReplacements,
  isPreferenceExcluded,
  type SwapCandidateRow,
} from './swap-candidates';
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

describe('eligibleReplacements', () => {
  it('drops the current item', () => {
    const result = eligibleReplacements(rows, 'a', noExclusions());
    expect(result.map((r) => r.id)).toEqual(['b', 'c']);
  });

  it('drops a preference-excluded category', () => {
    const exclusions = noExclusions();
    exclusions.category.add('cat-1');
    const result = eligibleReplacements(rows, 'a', exclusions);
    expect(result.map((r) => r.id)).toEqual(['b']);
  });

  it('drops an excluded food item, subcategory, or role', () => {
    const exclusions = noExclusions();
    exclusions.food_item.add('b');
    exclusions.subcategory.add('sub-3');
    expect(
      eligibleReplacements(rows, 'x', exclusions).map((r) => r.id),
    ).toEqual(['a']);

    const roleExcluded = noExclusions();
    roleExcluded.role.add('role-1');
    expect(eligibleReplacements(rows, 'x', roleExcluded)).toEqual([]);
  });

  it('returns an empty list when nothing is eligible', () => {
    expect(eligibleReplacements([rows[0]], 'a', noExclusions())).toEqual([]);
  });
});

describe('isPreferenceExcluded', () => {
  it('is false when no exclusion matches', () => {
    expect(isPreferenceExcluded(rows[0], noExclusions())).toBe(false);
  });

  it('is true when any of the four target types matches', () => {
    const exclusions = noExclusions();
    exclusions.subcategory.add('sub-1');
    expect(isPreferenceExcluded(rows[0], exclusions)).toBe(true);
  });
});
