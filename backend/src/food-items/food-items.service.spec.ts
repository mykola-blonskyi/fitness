import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { FoodItemsService } from './food-items.service';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';

async function listWhere(exclusions?: ExclusionTargets): Promise<string> {
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

  await new FoodItemsService(db as never).list('user-1', {}, exclusions);

  return new PgDialect().sqlToQuery(captured!).sql;
}

describe('FoodItemsService.list', () => {
  it('shows the whole verified catalog when no exclusions are passed', async () => {
    const sql = await listWhere();

    expect(sql).toContain('"food_calories"."is_verified" = $1');
    expect(sql).not.toContain('family_id');
    expect(sql).not.toContain('not in');
  });

  it('narrows to generation-eligible rows when exclusions are passed', async () => {
    const sql = await listWhere({
      category: new Set(['cat-meat']),
      subcategory: new Set(),
      role: new Set(),
      food_item: new Set(),
    });

    expect(sql).toContain('"food_calories"."family_id" is not null');
    expect(sql).toContain('"food_calories"."category_id" not in');
  });
});
