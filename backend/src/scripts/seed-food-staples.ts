// One-time import of the curated staples set (ADR-020 phase 1,
// data/food-staples.json) into food_calories. Run manually:
//   pnpm --filter backend db:seed:food-staples
// Safe to re-run: rows upsert on (source, sourceId) via insertItem, and
// translation rows are only added where missing. No DeepL, no network
// calls - every name is hand-authored in the data file. The deployed
// image has no ts-node, so on a server it is:
//   node dist/scripts/seed-food-staples.js
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import {
  insertItem,
  upsertTaxonomy,
  type CuratedItem,
} from './seed-food-catalog';
import { CURATED_SOURCE, STAPLE_LOCALES, STAPLES } from './food-staples';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const ids = await upsertTaxonomy(db);

  let imported = 0;
  let skippedExisting = 0;
  let translationsAdded = 0;

  for (const staple of STAPLES) {
    const item: CuratedItem = {
      name: staple.names.en,
      category: staple.category,
      subcategory: staple.subcategory,
      role: staple.role,
      caloriesPer100g: staple.caloriesPer100g,
      proteinPer100g: staple.proteinPer100g,
      carbsPer100g: staple.carbsPer100g,
      fatPer100g: staple.fatPer100g,
      source: CURATED_SOURCE,
      sourceId: staple.sourceId,
      isVerified: true,
    };
    const result = await insertItem(db, item, ids);
    if (result.inserted) imported++;
    else skippedExisting++;

    for (const locale of STAPLE_LOCALES) {
      const inserted = await db
        .insert(schema.foodCalorieTranslations)
        .values({
          foodCalorieId: result.foodCalorieId,
          locale,
          name: staple.names[locale],
          isVerified: true,
        })
        .onConflictDoNothing({
          target: [
            schema.foodCalorieTranslations.foodCalorieId,
            schema.foodCalorieTranslations.locale,
          ],
        })
        .returning({ id: schema.foodCalorieTranslations.id });
      if (inserted.length > 0) translationsAdded++;
    }
  }

  console.log(
    `Curated staples: imported ${imported}, already present ${skippedExisting}, ` +
      `translation rows added ${translationsAdded}.`,
  );

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
