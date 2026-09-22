import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { FoodItemsService, type GenerationScope } from './food-items.service';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';

function noExclusions(): ExclusionTargets {
  return {
    category: new Set(),
    subcategory: new Set(),
    role: new Set(),
    food_item: new Set(),
  };
}

function buildService(): { service: FoodItemsService; where: () => SQL } {
  let captured: SQL | undefined;
  const joined = {
    innerJoin: () => joined,
    leftJoin: () => ({
      where: (clause: SQL | undefined) => {
        captured = clause;
        return { orderBy: () => ({ limit: () => Promise.resolve([]) }) };
      },
    }),
  };
  const db = {
    query: { users: { findFirst: () => Promise.resolve(undefined) } },
    select: () => ({ from: () => joined }),
  };

  return {
    service: new FoodItemsService(db as never),
    where: () => captured!,
  };
}

async function listWhere(generationScope?: GenerationScope): Promise<string> {
  const { service, where } = buildService();
  await service.list('user-1', {}, generationScope);
  return new PgDialect().sqlToQuery(where()).sql;
}

const proteinSlot = {
  roleIds: ['role-lean-protein', 'role-dairy'],
  categoryIds: null,
};

describe('FoodItemsService.list', () => {
  it('shows the whole verified catalog when no generation scope is passed', async () => {
    const sql = await listWhere();

    expect(sql).toContain('"food_calories"."is_verified" = $1');
    expect(sql).not.toContain('family_id');
    expect(sql).not.toContain('not in');
  });

  it('narrows to generation-eligible rows when exclusions are passed', async () => {
    const sql = await listWhere({
      exclusions: { ...noExclusions(), category: new Set(['cat-meat']) },
      favoriteFoodItemIds: new Set(['chicken']),
      slot: proteinSlot,
    });

    expect(sql).toContain('"food_calories"."family_id" is not null');
    expect(sql).toContain('"food_calories"."category_id" not in');
  });

  it('narrows to the favorited items when a generation scope is passed', async () => {
    const sql = await listWhere({
      exclusions: noExclusions(),
      favoriteFoodItemIds: new Set(['chicken', 'rice']),
      slot: proteinSlot,
    });

    expect(sql).toContain('"food_calories"."id" in');
  });

  it('narrows to every Role in the slot, not the item own one', async () => {
    const sql = await listWhere({
      exclusions: noExclusions(),
      favoriteFoodItemIds: new Set(['chicken']),
      slot: proteinSlot,
    });

    expect(sql).toContain('"food_calories"."role_id" in ($2, $3)');
  });

  it('also narrows the protein slot by Category, as generation does', async () => {
    const sql = await listWhere({
      exclusions: noExclusions(),
      favoriteFoodItemIds: new Set(['chicken']),
      slot: { roleIds: ['role-lean-protein'], categoryIds: ['cat-meat'] },
    });

    expect(sql).toContain('"food_calories"."category_id" in');
  });

  it('returns nothing rather than querying when the favorites set is empty', async () => {
    const { service, where } = buildService();

    const page = await service.list(
      'user-1',
      {},
      {
        exclusions: noExclusions(),
        favoriteFoodItemIds: new Set(),
        slot: proteinSlot,
      },
    );

    expect(page).toEqual({ items: [], nextCursor: null });
    expect(where()).toBeUndefined();
  });
});

describe('FoodItemsService.findGenerationCandidates', () => {
  function buildService(): { service: FoodItemsService; where: () => SQL } {
    let captured: SQL | undefined;
    const joined = {
      leftJoin: () => joined,
      where: (clause: SQL | undefined) => {
        captured = clause;
        return Promise.resolve([]);
      },
    };
    const db = { select: () => ({ from: () => joined }) };
    return {
      service: new FoodItemsService(db as never),
      where: () => captured!,
    };
  }

  it('asks the database only for Family-classified, favorited rows', async () => {
    const { service, where } = buildService();

    await service.findGenerationCandidates(
      ['role-complex-carb'],
      new Set(['rice']),
      noExclusions(),
    );

    const sql = new PgDialect().sqlToQuery(where()).sql;
    expect(sql).toContain('"food_calories"."family_id" is not null');
    expect(sql).toContain('"food_calories"."id" in');
  });

  it('returns nothing rather than querying when the favorites set is empty', async () => {
    const { service, where } = buildService();

    const rows = await service.findGenerationCandidates(
      ['role-complex-carb'],
      new Set<string>(),
      noExclusions(),
    );

    expect(rows).toEqual([]);
    expect(where()).toBeUndefined();
  });

  it('returns nothing rather than querying when every role is excluded', async () => {
    const { service, where } = buildService();

    const rows = await service.findGenerationCandidates(
      [],
      new Set(['rice']),
      noExclusions(),
    );

    expect(rows).toEqual([]);
    expect(where()).toBeUndefined();
  });

  it('hands back the macros as numbers, not the decimals the driver returns', async () => {
    const db = {
      select: () => ({
        from: () => {
          const joined = {
            leftJoin: () => joined,
            where: () =>
              Promise.resolve([
                {
                  id: 'rice',
                  roleId: 'role-complex-carb',
                  caloriesPer100g: '130',
                  proteinPer100g: '2.7',
                  carbsPer100g: '28',
                  fatPer100g: '0.3',
                  familyName: 'grain_garnish',
                  categoryName: 'grains',
                },
              ]),
          };
          return joined;
        },
      }),
    };

    const [candidate] = await new FoodItemsService(
      db as never,
    ).findGenerationCandidates(
      ['role-complex-carb'],
      new Set(['rice']),
      noExclusions(),
    );

    expect(candidate).toEqual({
      id: 'rice',
      roleId: 'role-complex-carb',
      caloriesPer100g: 130,
      proteinPer100g: 2.7,
      carbsPer100g: 28,
      fatPer100g: 0.3,
      familyName: 'grain_garnish',
      categoryName: 'grains',
    });
  });
});

describe('FoodItemsService.findSlotCandidates', () => {
  async function slotWhere(): Promise<string> {
    let captured: SQL | undefined;
    const db = {
      query: {
        foodCalories: {
          findMany: (config: { where?: SQL }) => {
            captured = config.where;
            return Promise.resolve([]);
          },
        },
      },
    };

    await new FoodItemsService(db as never).findSlotCandidates(
      proteinSlot,
      noExclusions(),
      'cottage-cheese',
    );

    return new PgDialect().sqlToQuery(captured!).sql;
  }

  it('asks the database only for Family-classified rows', async () => {
    expect(await slotWhere()).toContain(
      '"food_calories"."family_id" is not null',
    );
  });

  it('does not require is_verified, which generation ignores', async () => {
    expect(await slotWhere()).not.toContain('is_verified');
  });

  it('reaches every role in the slot, not just the current one', async () => {
    const sql = await slotWhere();

    expect(sql).toContain('"food_calories"."role_id" in');
    expect(sql).not.toContain('"food_calories"."role_id" = ');
  });
});
