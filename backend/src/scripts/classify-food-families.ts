// Assigns food_calories.family_id across the whole catalog from the rules in
// food-families.ts (ADR-020). The seed scripts only ever set a Family on a
// freshly inserted row - they deliberately never rewrite an existing row's
// classification - so this is what classifies the already-imported dev and
// production catalogs, and what re-runs after an override is corrected.
// Run manually:
//   pnpm --filter backend db:classify:food-families
// Pass --dry-run to print the report without writing.
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { upsertTaxonomy } from './seed-food-catalog';
import {
  familyOverrideKey,
  familyOverrideKeys,
  resolveFamily,
  type FoodFamily,
} from './food-families';

type Db = ReturnType<typeof drizzle<typeof schema>>;

export interface ClassificationCounts {
  role: string;
  classified: number;
  unclassified: number;
}

export function countByRole(
  rows: { role: string; family: FoodFamily | null }[],
): ClassificationCounts[] {
  const byRole = new Map<string, ClassificationCounts>();
  for (const { role, family } of rows) {
    const entry = byRole.get(role) ?? {
      role,
      classified: 0,
      unclassified: 0,
    };
    if (family) entry.classified++;
    else entry.unclassified++;
    byRole.set(role, entry);
  }
  return [...byRole.values()].sort((a, b) => a.role.localeCompare(b.role));
}

export async function classify(db: Db, dryRun: boolean) {
  const ids = await upsertTaxonomy(db);

  const rows = await db
    .select({
      id: schema.foodCalories.id,
      name: schema.foodCalories.name,
      source: schema.foodCalories.source,
      sourceId: schema.foodCalories.sourceId,
      currentFamilyId: schema.foodCalories.familyId,
      subcategory: schema.foodSubcategories.name,
      role: schema.foodRoles.name,
    })
    .from(schema.foodCalories)
    .innerJoin(
      schema.foodSubcategories,
      eq(schema.foodCalories.subcategoryId, schema.foodSubcategories.id),
    )
    .innerJoin(
      schema.foodRoles,
      eq(schema.foodCalories.roleId, schema.foodRoles.id),
    );

  const resolved = rows.map((row) => ({
    ...row,
    family: resolveFamily(row),
  }));

  let updated = 0;
  for (const row of resolved) {
    const familyId = row.family ? ids.familyIds.get(row.family)! : null;
    if (familyId === row.currentFamilyId) continue;
    updated++;
    if (!dryRun) {
      await db
        .update(schema.foodCalories)
        .set({ familyId })
        .where(eq(schema.foodCalories.id, row.id));
    }
  }

  const present = new Set(
    resolved
      .filter((row) => row.source && row.sourceId)
      .map((row) => familyOverrideKey(row.source!, row.sourceId!)),
  );
  const unmatchedOverrides = familyOverrideKeys.filter(
    (key) => !present.has(key),
  );

  return {
    total: resolved.length,
    updated,
    counts: countByRole(resolved),
    unmatchedOverrides,
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const { total, updated, counts, unmatchedOverrides } = await classify(
    db,
    dryRun,
  );

  const classified = counts.reduce((sum, c) => sum + c.classified, 0);
  console.log(
    `${dryRun ? '[dry run] ' : ''}Food Family classification: ` +
      `${classified}/${total} rows carry a Family, ${updated} changed.`,
  );
  console.log('role'.padEnd(16), 'family'.padStart(8), 'none'.padStart(8));
  for (const c of counts) {
    console.log(
      c.role.padEnd(16),
      String(c.classified).padStart(8),
      String(c.unclassified).padStart(8),
    );
  }

  if (unmatchedOverrides.length > 0) {
    console.error(
      `\n${unmatchedOverrides.length} entries in data/food-families.json ` +
        'match no catalog row:',
    );
    for (const key of unmatchedOverrides) console.error('   ', key);
  }

  await pool.end();
  if (unmatchedOverrides.length > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
