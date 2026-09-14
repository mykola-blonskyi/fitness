import { PgDialect } from 'drizzle-orm/pg-core';
import {
  generationEligibleWhere,
  generationIneligibility,
  type EligibilityRow,
} from './food-eligibility';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';

function noExclusions(): ExclusionTargets {
  return {
    category: new Set(),
    subcategory: new Set(),
    role: new Set(),
    food_item: new Set(),
  };
}

function render(where: ReturnType<typeof generationEligibleWhere>): string {
  return new PgDialect().sqlToQuery(where!).sql;
}

const row = (overrides: Partial<EligibilityRow> = {}): EligibilityRow => ({
  id: 'a',
  categoryId: 'cat-1',
  subcategoryId: 'sub-1',
  roleId: 'role-1',
  familyId: 'family-1',
  ...overrides,
});

describe('generationEligibleWhere', () => {
  it('requires a Family even when the user has no exclusions at all', () => {
    expect(render(generationEligibleWhere(noExclusions()))).toBe(
      '"food_calories"."family_id" is not null',
    );
  });

  it('excludes each of the four preference target types', () => {
    const exclusions = noExclusions();
    exclusions.food_item.add('item-1');
    exclusions.category.add('cat-1');
    exclusions.subcategory.add('sub-1');
    exclusions.role.add('role-1');

    const sql = render(generationEligibleWhere(exclusions));

    expect(sql).toContain('"food_calories"."family_id" is not null');
    expect(sql).toContain('"food_calories"."id" not in');
    expect(sql).toContain('"food_calories"."category_id" not in');
    expect(sql).toContain('"food_calories"."subcategory_id" not in');
    expect(sql).toContain('"food_calories"."role_id" not in');
  });

  it('never filters on is_verified - generation ignores it', () => {
    const exclusions = noExclusions();
    exclusions.category.add('cat-1');
    expect(render(generationEligibleWhere(exclusions))).not.toContain(
      'is_verified',
    );
  });
});

describe('generationIneligibility', () => {
  it('is null for a Family-classified, unexcluded item', () => {
    expect(generationIneligibility(row(), noExclusions())).toBeNull();
  });

  it('reports no_family before any exclusion check', () => {
    const exclusions = noExclusions();
    exclusions.category.add('cat-1');
    expect(generationIneligibility(row({ familyId: null }), exclusions)).toBe(
      'no_family',
    );
  });

  it('reports preference_excluded for any of the four target types', () => {
    const exclusions = noExclusions();
    exclusions.subcategory.add('sub-1');
    expect(generationIneligibility(row(), exclusions)).toBe(
      'preference_excluded',
    );
  });

  it('excludes potato by category even though its role is now complex_carb', () => {
    const potato = row({
      id: 'potato',
      categoryId: 'vegetables',
      subcategoryId: 'starchy-vegetables',
      roleId: 'complex-carb',
      familyId: 'starchy-vegetable',
    });
    const exclusions = noExclusions();
    exclusions.category.add('vegetables');
    expect(generationIneligibility(potato, exclusions)).toBe(
      'preference_excluded',
    );
  });
});
