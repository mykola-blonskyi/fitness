import { UnprocessableEntityException } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { DietsService } from './diets.service';
import * as schema from '../db/schema';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';

type FoodItemRow = typeof schema.foodCalories.$inferSelect;

function noExclusions(): ExclusionTargets {
  return {
    category: new Set(),
    subcategory: new Set(),
    role: new Set(),
    food_item: new Set(),
  };
}

function render(where: SQL | undefined): string {
  return new PgDialect().sqlToQuery(where!).sql;
}

const foodItem = (overrides: Partial<FoodItemRow> = {}): FoodItemRow => ({
  id: 'chicken',
  name: 'Chicken breast',
  imageUrl: null,
  categoryId: 'cat-meat',
  subcategoryId: 'sub-poultry',
  roleId: 'role-lean-protein',
  familyId: 'family-poultry',
  caloriesPer100g: '165',
  proteinPer100g: '31',
  carbsPer100g: '0',
  fatPer100g: '3.6',
  source: null,
  sourceId: null,
  isVerified: false,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

function buildService(db: unknown): DietsService {
  const foodPreferencesService = {
    getFavoriteFoodItemIds: jest.fn().mockResolvedValue(new Set<string>()),
  };
  return new DietsService(
    db as never,
    {} as never,
    {} as never,
    foodPreferencesService as never,
    {} as never,
    {} as never,
  );
}

describe('DietsService.findCandidatesByRole', () => {
  it('asks the database only for Family-classified, favorited rows', async () => {
    let captured: SQL | undefined;
    const db = {
      select: () => ({
        from: () => {
          const joined = {
            leftJoin: () => joined,
            where: (clause: SQL | undefined) => {
              captured = clause;
              return Promise.resolve([]);
            },
          };
          return joined;
        },
      }),
    };

    await buildService(db)['findCandidatesByRole'](
      noExclusions(),
      new Map([['complex_carb', 'role-complex-carb']]),
      new Set(['rice']),
    );

    expect(render(captured)).toContain(
      '"food_calories"."family_id" is not null',
    );
    expect(render(captured)).toContain('"food_calories"."id" in');
  });

  it('skips the query entirely when the favorites set is empty', async () => {
    let queried = false;
    const db = {
      select: () => {
        queried = true;
        throw new Error('should not query');
      },
    };

    const result = await buildService(db)['findCandidatesByRole'](
      noExclusions(),
      new Map([['complex_carb', 'role-complex-carb']]),
      new Set<string>(),
    );

    expect(queried).toBe(false);
    expect(result.get('complex_carb')).toEqual([]);
  });
});

describe('DietsService.pickRerollReplacement', () => {
  async function rerollWhere(): Promise<string> {
    let captured: SQL | undefined;
    const db = {
      query: {
        foodCalories: {
          findMany: (config: { where?: SQL }) => {
            captured = config.where;
            return Promise.resolve([foodItem({ id: 'cod' })]);
          },
        },
      },
    };

    await buildService(db)['pickRerollReplacement'](
      foodItem(),
      noExclusions(),
      (items) => items[0],
    );

    return render(captured);
  }

  it('asks the database only for Family-classified rows', async () => {
    expect(await rerollWhere()).toContain(
      '"food_calories"."family_id" is not null',
    );
  });

  it('does not require is_verified, which generation ignores', async () => {
    expect(await rerollWhere()).not.toContain('is_verified');
  });

  it('draws from the whole role, favorited or not (ADR-025)', async () => {
    const rows = [foodItem({ id: 'cod' }), foodItem({ id: 'turkey' })];
    const db = {
      query: { foodCalories: { findMany: () => Promise.resolve(rows) } },
    };

    const replacement = await buildService(db)['pickRerollReplacement'](
      foodItem(),
      noExclusions(),
      (items) => items[0],
    );

    expect(replacement.id).toBe('cod');
  });
});

describe('DietsService.resolveExplicitReplacement', () => {
  function buildDb(replacement: FoodItemRow) {
    return {
      query: {
        foodCalories: { findFirst: () => Promise.resolve(replacement) },
      },
    };
  }

  it('rejects a replacement with no Family', async () => {
    const db = buildDb(foodItem({ id: 'wheat-flour', familyId: null }));

    await expect(
      buildService(db)['resolveExplicitReplacement'](
        'wheat-flour',
        foodItem(),
        noExclusions(),
        new Set(['wheat-flour']),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a replacement outside the favorites (ADR-025)', async () => {
    const db = buildDb(foodItem({ id: 'cod' }));

    await expect(
      buildService(db)['resolveExplicitReplacement'](
        'cod',
        foodItem(),
        noExclusions(),
        new Set(['turkey']),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('accepts a favorited, Family-classified replacement in the same role', async () => {
    const db = buildDb(foodItem({ id: 'cod' }));

    const replacement = await buildService(db)['resolveExplicitReplacement'](
      'cod',
      foodItem(),
      noExclusions(),
      new Set(['cod']),
    );

    expect(replacement.id).toBe('cod');
  });
});
