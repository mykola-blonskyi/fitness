import { PgDialect } from 'drizzle-orm/pg-core';
import {
  generationEligibleWhere,
  generationIneligibility,
  resolveSlotConstraint,
  satisfiesSlot,
  slotEligibleWhere,
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

describe('resolveSlotConstraint', () => {
  const taxonomy = {
    roleIdByName: new Map([
      ['lean_protein', 'role-lean-protein'],
      ['fatty_protein', 'role-fatty-protein'],
      ['plant_protein', 'role-plant-protein'],
      ['dairy', 'role-dairy'],
      ['complex_carb', 'role-complex-carb'],
      ['simple_carb', 'role-simple-carb'],
      ['vegetable', 'role-vegetable'],
      ['healthy_fat', 'role-healthy-fat'],
      ['saturated_fat', 'role-saturated-fat'],
      ['treat', 'role-treat'],
    ]),
    categoryIdByName: new Map([
      ['meat', 'cat-meat'],
      ['fish', 'cat-fish'],
      ['dairy', 'cat-dairy'],
      ['eggs', 'cat-eggs'],
      ['legumes', 'cat-legumes'],
      ['nuts', 'cat-nuts'],
    ]),
  };

  it('pools the whole protein chain, whichever of its roles the item holds', () => {
    const fromDairy = resolveSlotConstraint('role-dairy', taxonomy, []);

    expect([...fromDairy.roleIds].sort()).toEqual([
      'role-dairy',
      'role-fatty-protein',
      'role-lean-protein',
      'role-plant-protein',
    ]);
  });

  it('keeps an omnivore out of the legumes generation never serves her', () => {
    const constraint = resolveSlotConstraint('role-lean-protein', taxonomy, []);

    expect(constraint.categoryIds).not.toContain('cat-legumes');
    expect(
      satisfiesSlot(
        row({ roleId: 'role-plant-protein', categoryId: 'cat-legumes' }),
        constraint,
      ),
    ).toBe(false);
  });

  it('opens legumes to a vegetarian, matching proteinCategoriesFor', () => {
    const constraint = resolveSlotConstraint('role-lean-protein', taxonomy, [
      'vegetarian',
    ]);

    expect(
      satisfiesSlot(
        row({ roleId: 'role-plant-protein', categoryId: 'cat-legumes' }),
        constraint,
      ),
    ).toBe(true);
  });

  it('leaves the non-protein slots unfiltered by Category', () => {
    const carb = resolveSlotConstraint('role-simple-carb', taxonomy, []);

    expect(carb.categoryIds).toBeNull();
    expect([...carb.roleIds].sort()).toEqual([
      'role-complex-carb',
      'role-simple-carb',
    ]);
  });

  it('degrades to the item own role when no slot draws it', () => {
    const treat = resolveSlotConstraint('role-treat', taxonomy, []);

    expect(treat.roleIds).toEqual(['role-treat']);
    expect(treat.categoryIds).toBeNull();
  });

  it('agrees between its SQL form and its row form', () => {
    const constraint = resolveSlotConstraint('role-dairy', taxonomy, []);

    expect(render(slotEligibleWhere(constraint))).toContain(
      '"food_calories"."role_id" in',
    );
    expect(
      satisfiesSlot(
        row({ roleId: 'role-lean-protein', categoryId: 'cat-meat' }),
        constraint,
      ),
    ).toBe(true);
    expect(
      satisfiesSlot(
        row({ roleId: 'role-vegetable', categoryId: 'cat-vegetables' }),
        constraint,
      ),
    ).toBe(false);
  });
});
