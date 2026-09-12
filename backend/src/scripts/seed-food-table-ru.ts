// One-time curated import of a generic Russian-language "КБЖУ per 100 g"
// reference table (data/food-table-ru.json - Soviet/CIS staples: гречка,
// творог, сало, кефир, борщ-tier ingredients) into food_calories, for
// users whose local diet the Open Food Facts/USDA import doesn't cover
// (knowledge/business-rules.md "Food/exercise data import"). Run manually:
//   pnpm --filter backend db:seed:food-table-ru
// Safe to re-run: rows upsert on (source, sourceId) via insertItem, so an
// already-imported item is skipped; translation rows are only added where
// missing, so an interrupted DeepL pass resumes where it stopped.
//
// Names in the table are Russian. The base `name` column is English by
// convention (business-rules.md "Catalog display names..."), so it is
// machine-translated ru -> en here; the Russian original is stored as the
// `ru` translation verbatim, and uk/es are translated from the Russian
// source (not from the English round-trip), except where
// data/food-table-ru.names.json overrides a name DeepL got wrong.
// Without DEEPL_API_KEY the
// script still imports, storing the Russian name as the base name with a
// warning - a later run with the key set does not retroactively fix
// those base names (insertItem never overwrites), so set it up front.
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import {
  insertItem,
  translate,
  upsertTaxonomy,
  type CuratedItem,
} from './seed-food-catalog';
import { RU_TABLE_SOURCE, has } from './food-families';
import table from './data/food-table-ru.json';
import nameOverrides from './data/food-table-ru.names.json';

const SOURCE = RU_TABLE_SOURCE;
const DEEPL_CALL_DELAY_MS = 250;
// Translated *from* Russian, so 'ru' itself is stored verbatim, never
// round-tripped through DeepL.
const TRANSLATED_LOCALES = ['uk', 'es'] as const;

// DeepL misreads many of the table's Russian names as ordinary words
// (Треска -> "Fever", Сом -> "Monday"), and gets all three target locales
// wrong at once because each is translated from the same Russian. These
// are hand-checked replacements for the rows it got wrong; they apply at
// insert time only, so rows already imported need fixing separately.
const NAME_OVERRIDES: Record<
  string,
  { en: string; uk: string; es: string } | undefined
> = nameOverrides;

interface TableItem {
  name: string;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
}

interface TableSection {
  key: string;
  titleRu: string;
  items: TableItem[];
}

export interface Classification {
  category: string;
  subcategory: string;
  role: string;
}

// Explicit section -> taxonomy mapping (business-rules.md requires this be
// explicit, not inferred), refined per item by name and by the same
// nutrient thresholds seed-food-catalog.ts's resolveOffClassification uses
// (meat fat >= 10 fatty, fish fat >= 5 fatty, dairy fat >= 3.25 full-fat,
// vegetables carbs >= 15 starchy). Some sections split across categories
// on purpose: the table files pulses under "Овощи" and dried fruit under
// "Орехи и сухофрукты", and the taxonomy doesn't.
export function classifyTableItem(
  section: string,
  item: TableItem,
): Classification | null {
  const { name, fat, carbs } = item;
  switch (section) {
    case 'alcoholic_beverages':
      return {
        category: 'beverages',
        subcategory: 'alcoholic_beverages',
        role: 'beverage',
      };
    case 'non_alcoholic_beverages':
      return {
        category: 'beverages',
        subcategory: 'non_alcoholic_beverages',
        role: 'beverage',
      };
    case 'porridge':
      // Corn flakes are the only refined/sweetened entry in the section.
      if (has(name, 'кукурузные хлопья'))
        return {
          category: 'grains',
          subcategory: 'simple_carbs',
          role: 'simple_carb',
        };
      return {
        category: 'grains',
        subcategory: 'complex_carbs',
        role: 'complex_carb',
      };
    case 'mushrooms':
      return {
        category: 'vegetables',
        subcategory: 'other_vegetables',
        role: 'vegetable',
      };
    case 'roe':
      return fat >= 5
        ? { category: 'fish', subcategory: 'fatty_fish', role: 'fatty_protein' }
        : { category: 'fish', subcategory: 'lean_fish', role: 'lean_protein' };
    case 'fats':
      // Animal fats, margarine and butter are saturated; the vegetable
      // oils (and mayonnaise, which is mostly sunflower oil) are not.
      if (has(name, 'жир ', 'маргарин', 'сливочное', 'топленое'))
        return {
          category: 'oils',
          subcategory: 'saturated_oils',
          role: 'saturated_fat',
        };
      return {
        category: 'oils',
        subcategory: 'healthy_oils',
        role: 'healthy_fat',
      };
    case 'dairy':
      if (
        has(
          name,
          'кефир',
          'йогурт',
          'простокваша',
          'ряженка',
          'сметана',
          'творог',
          'сырки',
        )
      )
        return {
          category: 'dairy',
          subcategory: 'fermented_dairy',
          role: 'dairy',
        };
      return fat >= 3.25
        ? { category: 'dairy', subcategory: 'full_fat_dairy', role: 'dairy' }
        : { category: 'dairy', subcategory: 'low_fat_dairy', role: 'dairy' };
    case 'eggs':
      return {
        category: 'eggs',
        subcategory: 'whole_eggs',
        role: 'lean_protein',
      };
    case 'sausages':
      return {
        category: 'meat',
        subcategory: 'processed_meat',
        role: 'fatty_protein',
      };
    case 'meat':
      return fat >= 10
        ? { category: 'meat', subcategory: 'fatty_meat', role: 'fatty_protein' }
        : { category: 'meat', subcategory: 'lean_meat', role: 'lean_protein' };
    case 'fish':
      if (
        has(
          name,
          'кальмар',
          'краб',
          'креветк',
          'мидии',
          'осьминог',
          'раки',
          'устриц',
        )
      )
        return {
          category: 'fish',
          subcategory: 'shellfish',
          role: 'lean_protein',
        };
      return fat >= 5
        ? { category: 'fish', subcategory: 'fatty_fish', role: 'fatty_protein' }
        : { category: 'fish', subcategory: 'lean_fish', role: 'lean_protein' };
    case 'vegetables':
      if (has(name, 'бобы', 'фасоль'))
        return {
          category: 'legumes',
          subcategory: 'beans',
          role: 'plant_protein',
        };
      if (has(name, 'горошек'))
        return {
          category: 'legumes',
          subcategory: 'lentils_and_peas',
          role: 'plant_protein',
        };
      if (has(name, 'салат', 'шпинат', 'щавель', 'зелень', 'лук зеленый'))
        return {
          category: 'vegetables',
          subcategory: 'leafy_vegetables',
          role: 'vegetable',
        };
      if (has(name, 'капуста', 'редис', 'редька', 'репа', 'брюква', 'хрен'))
        return {
          category: 'vegetables',
          subcategory: 'cruciferous_vegetables',
          role: 'vegetable',
        };
      if (has(name, 'картофель') || carbs >= 15)
        return {
          category: 'vegetables',
          subcategory: 'starchy_vegetables',
          role: 'vegetable',
        };
      return {
        category: 'vegetables',
        subcategory: 'other_vegetables',
        role: 'vegetable',
      };
    case 'fruits':
      return has(name, 'сушен')
        ? { category: 'fruits', subcategory: 'dried_fruit', role: 'fruit' }
        : { category: 'fruits', subcategory: 'fresh_fruit', role: 'fruit' };
    case 'nuts_and_dried_fruits':
      if (has(name, 'семя', 'семечк'))
        return { category: 'nuts', subcategory: 'seeds', role: 'healthy_fat' };
      // Anything without the fat of a nut is one of the dried fruits.
      if (fat < 5)
        return {
          category: 'fruits',
          subcategory: 'dried_fruit',
          role: 'fruit',
        };
      return {
        category: 'nuts',
        subcategory: 'tree_nuts',
        role: 'healthy_fat',
      };
    case 'sweets':
      return {
        category: 'sweets',
        subcategory: 'confectionery',
        role: 'treat',
      };
    case 'bread':
      return has(name, 'ржан')
        ? {
            category: 'grains',
            subcategory: 'complex_carbs',
            role: 'complex_carb',
          }
        : {
            category: 'grains',
            subcategory: 'simple_carbs',
            role: 'simple_carb',
          };
    default:
      return null;
  }
}

// Stable per-row identity for (source, sourceId) idempotency: the table has
// no ids of its own, so the section plus the Russian name stands in. Names
// are unique within a section, and the section prefix keeps e.g. a future
// duplicate name across sections from colliding.
export function tableSourceId(section: string, name: string): string {
  return `${section}:${name.toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function translateOrNull(
  text: string,
  targetLocale: string,
  apiKey: string,
): Promise<string | null> {
  try {
    return await translate(text, targetLocale, apiKey);
  } catch (err) {
    // One stubborn name shouldn't sink the whole batch - a re-run picks
    // up anything left untranslated (missing-row check in main).
    console.warn(
      `DeepL: giving up on "${text}" -> ${targetLocale} (${String(err)})`,
    );
    return null;
  } finally {
    await new Promise((r) => setTimeout(r, DEEPL_CALL_DELAY_MS));
  }
}

async function upsertTranslation(
  db: Db,
  foodCalorieId: string,
  locale: string,
  name: string,
): Promise<boolean> {
  const existing = await db.query.foodCalorieTranslations.findFirst({
    where: and(
      eq(schema.foodCalorieTranslations.foodCalorieId, foodCalorieId),
      eq(schema.foodCalorieTranslations.locale, locale),
    ),
  });
  if (existing) return false;
  await db
    .insert(schema.foodCalorieTranslations)
    .values({ foodCalorieId, locale, name })
    .onConflictDoNothing({
      target: [
        schema.foodCalorieTranslations.foodCalorieId,
        schema.foodCalorieTranslations.locale,
      ],
    });
  return true;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const deeplApiKey = process.env.DEEPL_API_KEY;
  if (!deeplApiKey) {
    console.warn(
      'DEEPL_API_KEY not set - apart from the rows in ' +
        'data/food-table-ru.names.json, base names will be stored in ' +
        'Russian and no uk/es translations added. Set it before the ' +
        'first run if possible: base names are never rewritten on a ' +
        'later run.',
    );
  }

  const ids = await upsertTaxonomy(db);

  let imported = 0;
  let skippedExisting = 0;
  let unmapped = 0;
  let translated = 0;
  let translationsFailed = 0;

  for (const section of table.sections as TableSection[]) {
    for (const item of section.items) {
      const classification = classifyTableItem(section.key, item);
      if (!classification) {
        console.warn(`No mapping for section "${section.key}" - skipped.`);
        unmapped++;
        continue;
      }

      const sourceId = tableSourceId(section.key, item.name);
      const override = NAME_OVERRIDES[sourceId];
      const existing = await db.query.foodCalories.findFirst({
        where: and(
          eq(schema.foodCalories.source, SOURCE),
          eq(schema.foodCalories.sourceId, sourceId),
        ),
        columns: { id: true },
      });

      let foodCalorieId: string;
      if (existing) {
        foodCalorieId = existing.id;
        skippedExisting++;
      } else {
        const englishName =
          override?.en ??
          (deeplApiKey
            ? await translateOrNull(item.name, 'en-US', deeplApiKey)
            : null);
        if (deeplApiKey && !englishName) {
          // Better to leave the row for a re-run than to bake a Russian
          // base name in permanently (insertItem never overwrites it).
          console.warn(
            `Skipping "${item.name}" - base-name translation failed.`,
          );
          translationsFailed++;
          continue;
        }

        const curated: CuratedItem = {
          name: englishName ?? item.name,
          ...classification,
          caloriesPer100g: item.kcal,
          proteinPer100g: item.protein,
          carbsPer100g: item.carbs,
          fatPer100g: item.fat,
          source: SOURCE,
          sourceId,
        };
        const result = await insertItem(db, curated, ids);
        foodCalorieId = result.foodCalorieId;
        if (result.inserted) imported++;
        else skippedExisting++;
      }

      // The Russian original is a translation row, not the base name -
      // added even for rows that already existed, so a run interrupted
      // mid-translation resumes cleanly.
      if (await upsertTranslation(db, foodCalorieId, 'ru', item.name))
        translated++;

      for (const locale of TRANSLATED_LOCALES) {
        const already = await db.query.foodCalorieTranslations.findFirst({
          where: and(
            eq(schema.foodCalorieTranslations.foodCalorieId, foodCalorieId),
            eq(schema.foodCalorieTranslations.locale, locale),
          ),
          columns: { id: true },
        });
        if (already) continue;
        const name =
          override?.[locale] ??
          (deeplApiKey
            ? await translateOrNull(item.name, locale, deeplApiKey)
            : null);
        if (!name) {
          if (deeplApiKey) translationsFailed++;
          continue;
        }
        if (await upsertTranslation(db, foodCalorieId, locale, name))
          translated++;
      }
    }
  }

  console.log(
    `RU КБЖУ table: imported ${imported}, already present ${skippedExisting}, ` +
      `unmapped ${unmapped}; translation rows added ${translated}` +
      (translationsFailed > 0
        ? `, ${translationsFailed} failed (re-run to retry).`
        : '.'),
  );

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
