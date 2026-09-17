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
    });

    expect(sql).toContain('"food_calories"."family_id" is not null');
    expect(sql).toContain('"food_calories"."category_id" not in');
  });

  it('narrows to the favorited items when a generation scope is passed', async () => {
    const sql = await listWhere({
      exclusions: noExclusions(),
      favoriteFoodItemIds: new Set(['chicken', 'rice']),
    });

    expect(sql).toContain('"food_calories"."id" in ($2, $3)');
  });

  it('returns nothing rather than querying when the favorites set is empty', async () => {
    const { service, where } = buildService();

    const page = await service.list(
      'user-1',
      {},
      {
        exclusions: noExclusions(),
        favoriteFoodItemIds: new Set(),
      },
    );

    expect(page).toEqual({ items: [], nextCursor: null });
    expect(where()).toBeUndefined();
  });
});
