// One-time curated import from Open Food Facts and USDA FoodData Central
// into food_calories (FITNESS-27, knowledge/business-rules.md "Food/
// exercise data import"). Run manually:
//   pnpm --filter backend db:seed:food-catalog
// Safe to re-run: taxonomy rows are upserted on name, food_calories rows
// on (source, sourceId), so an already-imported item is skipped rather
// than duplicated - except a missing image_url, which gets backfilled onto
// the existing row (see insertItem) since that field didn't exist at the
// time of the first import. USDA import is skipped (with a warning) if
// USDA_API_KEY is unset; translation is skipped (with a warning) if
// DEEPL_API_KEY is unset - both stay optional so this script still does
// something useful without either.
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { Macros } from '../food-items/food-item.types';

const USER_AGENT = 'FitnessApp-SeedScript/1.0 (+https://fitness.blonskyi.dev)';
const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2/search';
const OFF_IMAGE_HOST = 'images.openfoodfacts.org';
const OFF_IMAGE_PATH_PREFIX = '/images/products/';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const DEEPL_TARGET_LOCALES = ['uk', 'ru', 'es'] as const;

// OFF is a public, community-editable dataset - a product's image_front_url
// is untrusted input, not a value we can assume is well-formed. Only accept
// an https URL on OFF's own image host and path - kept in lock-step with
// frontend/next.config.ts's images.remotePatterns entry
// (hostname: 'images.openfoodfacts.org', pathname: '/images/products/**'):
// a URL this rejects would be refused by next/image anyway, so better to
// never persist it. Anything else - a malformed value, an unexpected host
// or path - is dropped rather than stored.
export function sanitizeOffImageUrl(
  url: string | undefined,
): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === 'https:' &&
      parsed.hostname === OFF_IMAGE_HOST &&
      parsed.pathname.startsWith(OFF_IMAGE_PATH_PREFIX)
    ) {
      return url;
    }
  } catch {
    // Not a parseable URL - fall through to undefined.
  }
  return undefined;
}

// ---------------------------------------------------------------------
// Fixed taxonomy (knowledge/domain-model.md "Food Category / Food
// Subcategory / Food Role") - the only place these values are listed as
// data; schema.ts's inline comments are documentation of the same set.
// ---------------------------------------------------------------------

const TAXONOMY: Record<string, string[]> = {
  meat: ['lean_meat', 'fatty_meat', 'processed_meat'],
  fish: ['lean_fish', 'fatty_fish', 'shellfish'],
  dairy: ['low_fat_dairy', 'full_fat_dairy', 'fermented_dairy'],
  vegetables: [
    'leafy_vegetables',
    'cruciferous_vegetables',
    'starchy_vegetables',
    'other_vegetables',
  ],
  fruits: ['fresh_fruit', 'dried_fruit'],
  grains: ['complex_carbs', 'simple_carbs'],
  legumes: ['beans', 'lentils_and_peas'],
  nuts: ['tree_nuts', 'seeds'],
  oils: ['healthy_oils', 'saturated_oils'],
  eggs: ['whole_eggs', 'egg_whites'],
};

const ROLES = [
  'lean_protein',
  'fatty_protein',
  'plant_protein',
  'complex_carb',
  'simple_carb',
  'vegetable',
  'fruit',
  'healthy_fat',
  'saturated_fat',
  'dairy',
  'treat',
];

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function upsertTaxonomy(db: Db) {
  const categoryIds = new Map<string, string>();
  const subcategoryIds = new Map<string, string>();
  const roleIds = new Map<string, string>();

  for (const categoryName of Object.keys(TAXONOMY)) {
    const [row] = await db
      .insert(schema.foodCategories)
      .values({ name: categoryName })
      .onConflictDoUpdate({
        target: schema.foodCategories.name,
        set: { name: categoryName },
      })
      .returning();
    categoryIds.set(categoryName, row.id);

    for (const subcategoryName of TAXONOMY[categoryName]) {
      const [subRow] = await db
        .insert(schema.foodSubcategories)
        .values({ categoryId: row.id, name: subcategoryName })
        .onConflictDoUpdate({
          target: schema.foodSubcategories.name,
          set: { name: subcategoryName },
        })
        .returning();
      subcategoryIds.set(subcategoryName, subRow.id);
    }
  }

  for (const roleName of ROLES) {
    const [row] = await db
      .insert(schema.foodRoles)
      .values({ name: roleName })
      .onConflictDoUpdate({
        target: schema.foodRoles.name,
        set: { name: roleName },
      })
      .returning();
    roleIds.set(roleName, row.id);
  }

  return { categoryIds, subcategoryIds, roleIds };
}

// ---------------------------------------------------------------------
// Shared curated-item shape both sources normalize into before insert.
// ---------------------------------------------------------------------

interface CuratedItem extends Macros {
  name: string;
  category: string;
  subcategory: string;
  role: string;
  source: string;
  sourceId: string;
  imageUrl?: string;
}

// ---------------------------------------------------------------------
// Open Food Facts - explicit category-tag -> project-category mapping
// (business-rules.md requires this be explicit, not inferred).
// Subcategory/role within a category are resolved from OFF's own
// categories_tags plus nutrient thresholds, since OFF has no clean
// lean/fatty-style distinction of its own - see resolveOffClassification.
// ---------------------------------------------------------------------

const OFF_CATEGORY_TAGS: Record<string, string> = {
  meat: 'meats',
  fish: 'fishes',
  dairy: 'dairies',
  vegetables: 'vegetables',
  fruits: 'fruits',
  grains: 'cereals',
  legumes: 'legumes',
  nuts: 'nuts',
  oils: 'fats',
  eggs: 'eggs',
};

const ITEMS_PER_CATEGORY = 15;
const OFF_PAGE_SIZE = 50;
const OFF_MAX_PAGES = 8; // ~13% of results are lang=en - scan generously.

interface OffProduct {
  code: string;
  product_name?: string;
  lang?: string;
  categories_tags?: string[];
  nutriments?: Record<string, number>;
  image_front_url?: string;
}

interface OffSearchResponse {
  products: OffProduct[];
  page_count: number;
}

export function resolveOffClassification(
  category: string,
  tags: string[],
  nutriments: Record<string, number>,
): { subcategory: string; role: string } | null {
  const has = (tag: string) => tags.includes(`en:${tag}`);
  const fat = nutriments['fat_100g'] ?? 0;
  const carbs = nutriments['carbohydrates_100g'] ?? 0;
  const sugars = nutriments['sugars_100g'] ?? 0;
  const saturatedFat = nutriments['saturated-fat_100g'] ?? 0;

  switch (category) {
    case 'meat': {
      if (has('prepared-meats') || has('cold-cuts') || has('sausages'))
        return { subcategory: 'processed_meat', role: 'fatty_protein' };
      if (fat >= 10)
        return { subcategory: 'fatty_meat', role: 'fatty_protein' };
      return { subcategory: 'lean_meat', role: 'lean_protein' };
    }
    case 'fish': {
      if (has('shellfish') || has('crustaceans') || has('molluscs'))
        return { subcategory: 'shellfish', role: 'lean_protein' };
      if (fat >= 5) return { subcategory: 'fatty_fish', role: 'fatty_protein' };
      return { subcategory: 'lean_fish', role: 'lean_protein' };
    }
    case 'dairy': {
      if (
        has('fermented-foods') ||
        has('fermented-milk-products') ||
        has('yogurts')
      )
        return { subcategory: 'fermented_dairy', role: 'dairy' };
      if (fat >= 3.25) return { subcategory: 'full_fat_dairy', role: 'dairy' };
      return { subcategory: 'low_fat_dairy', role: 'dairy' };
    }
    case 'vegetables': {
      if (has('leaf-vegetables'))
        return { subcategory: 'leafy_vegetables', role: 'vegetable' };
      if (has('cabbages') || has('brassicas') || has('cruciferous-vegetables'))
        return { subcategory: 'cruciferous_vegetables', role: 'vegetable' };
      if (has('potatoes') || has('root-vegetables') || carbs >= 15)
        return { subcategory: 'starchy_vegetables', role: 'vegetable' };
      return { subcategory: 'other_vegetables', role: 'vegetable' };
    }
    case 'fruits': {
      if (has('dried-fruits'))
        return { subcategory: 'dried_fruit', role: 'fruit' };
      return { subcategory: 'fresh_fruit', role: 'fruit' };
    }
    case 'grains': {
      if (has('refined-cereals') || has('white-breads') || sugars >= 10)
        return { subcategory: 'simple_carbs', role: 'simple_carb' };
      return { subcategory: 'complex_carbs', role: 'complex_carb' };
    }
    case 'legumes': {
      if (has('lentils') || has('peas'))
        return { subcategory: 'lentils_and_peas', role: 'plant_protein' };
      return { subcategory: 'beans', role: 'plant_protein' };
    }
    case 'nuts': {
      if (has('seeds')) return { subcategory: 'seeds', role: 'healthy_fat' };
      return { subcategory: 'tree_nuts', role: 'healthy_fat' };
    }
    case 'oils': {
      if (
        has('palm-oil') ||
        has('coconut-oil') ||
        has('butter') ||
        (fat > 0 && saturatedFat / fat >= 0.4)
      )
        return { subcategory: 'saturated_oils', role: 'saturated_fat' };
      return { subcategory: 'healthy_oils', role: 'healthy_fat' };
    }
    case 'eggs': {
      if (has('egg-whites'))
        return { subcategory: 'egg_whites', role: 'lean_protein' };
      return { subcategory: 'whole_eggs', role: 'lean_protein' };
    }
    default:
      return null;
  }
}

// OFF is empirically flaky (sustained intermittent 503s observed while
// building this script - single requests needed up to ~20s of backoff to
// succeed) - retry generously with backoff rather than treating a 5xx as
// fatal after only a couple of tries.
async function fetchWithRetry(url: string, attempts = 8): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (res.ok) return res;
      if (res.status >= 500 && attempt < attempts) {
        await new Promise((r) => setTimeout(r, attempt * 4000));
        continue;
      }
      throw new Error(`Request failed: ${res.status} ${url}`);
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, attempt * 4000));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchOffCategory(
  category: string,
  offTag: string,
): Promise<CuratedItem[]> {
  const items: CuratedItem[] = [];
  const seenNames = new Set<string>();

  for (
    let page = 1;
    page <= OFF_MAX_PAGES && items.length < ITEMS_PER_CATEGORY;
    page++
  ) {
    const url =
      `${OFF_BASE_URL}?categories_tags_en=${offTag}` +
      `&fields=code,product_name,lang,categories_tags,nutriments,image_front_url` +
      `&page=${page}&page_size=${OFF_PAGE_SIZE}`;
    let data: OffSearchResponse;
    try {
      const res = await fetchWithRetry(url);
      data = (await res.json()) as OffSearchResponse;
    } catch (err) {
      // A page that never recovers shouldn't sink the whole category -
      // take whatever was already curated from earlier pages and move on.
      console.warn(
        `Open Food Facts: giving up on ${offTag} page ${page} after retries (${String(err)})`,
      );
      break;
    }
    if (data.products.length === 0) break;

    for (const product of data.products) {
      if (items.length >= ITEMS_PER_CATEGORY) break;
      if (product.lang !== 'en') continue;
      const name = product.product_name?.trim();
      if (!name || seenNames.has(name.toLowerCase())) continue;

      const n = product.nutriments ?? {};
      const calories = n['energy-kcal_100g'];
      const protein = n['proteins_100g'];
      const carbs = n['carbohydrates_100g'];
      const fat = n['fat_100g'];
      if (
        calories === undefined ||
        protein === undefined ||
        carbs === undefined ||
        fat === undefined
      )
        continue;

      const classification = resolveOffClassification(
        category,
        product.categories_tags ?? [],
        n,
      );
      if (!classification) continue;

      seenNames.add(name.toLowerCase());
      items.push({
        name,
        category,
        subcategory: classification.subcategory,
        role: classification.role,
        caloriesPer100g: calories,
        proteinPer100g: protein,
        carbsPer100g: carbs,
        fatPer100g: fat,
        source: 'open_food_facts',
        sourceId: product.code,
        imageUrl: sanitizeOffImageUrl(product.image_front_url),
      });
    }
  }

  return items;
}

// ---------------------------------------------------------------------
// USDA FoodData Central - foodCategory is free-text (e.g. "Dairy and Egg
// Products"), mapped to our category via explicit substring matching,
// same spirit as the OFF tag mapping above. Nutrient values come as a
// foodNutrients array keyed by nutrientId (standard USDA ids: Energy
// 1008, Protein 1003, Carbohydrate 1005, Total fat 1004).
// ---------------------------------------------------------------------

const USDA_QUERIES: { category: string; query: string }[] = [
  { category: 'meat', query: 'meat' },
  { category: 'fish', query: 'fish' },
  { category: 'dairy', query: 'dairy' },
  { category: 'vegetables', query: 'vegetable' },
  { category: 'fruits', query: 'fruit' },
  { category: 'grains', query: 'grain' },
  { category: 'legumes', query: 'beans' },
  { category: 'nuts', query: 'nuts' },
  { category: 'oils', query: 'oil' },
  { category: 'eggs', query: 'egg' },
];

const USDA_NUTRIENT_IDS = {
  energy: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
};

interface UsdaFoodNutrient {
  nutrientId: number;
  value: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  foodNutrients: UsdaFoodNutrient[];
}

interface UsdaSearchResponse {
  foods: UsdaFood[];
}

export function resolveUsdaClassification(
  category: string,
  description: string,
): { subcategory: string; role: string } | null {
  const d = description.toLowerCase();

  switch (category) {
    case 'meat': {
      if (
        d.includes('sausage') ||
        d.includes('bacon') ||
        d.includes('ham') ||
        d.includes('bologna')
      )
        return { subcategory: 'processed_meat', role: 'fatty_protein' };
      if (d.includes('ground') || d.includes('fat') || d.includes('rib'))
        return { subcategory: 'fatty_meat', role: 'fatty_protein' };
      return { subcategory: 'lean_meat', role: 'lean_protein' };
    }
    case 'fish': {
      if (
        d.includes('shrimp') ||
        d.includes('crab') ||
        d.includes('lobster') ||
        d.includes('clam') ||
        d.includes('mussel')
      )
        return { subcategory: 'shellfish', role: 'lean_protein' };
      if (
        d.includes('salmon') ||
        d.includes('mackerel') ||
        d.includes('sardine') ||
        d.includes('tuna')
      )
        return { subcategory: 'fatty_fish', role: 'fatty_protein' };
      return { subcategory: 'lean_fish', role: 'lean_protein' };
    }
    case 'dairy': {
      if (d.includes('yogurt') || d.includes('kefir') || d.includes('cultured'))
        return { subcategory: 'fermented_dairy', role: 'dairy' };
      if (d.includes('whole') || d.includes('cream') || d.includes('cheese'))
        return { subcategory: 'full_fat_dairy', role: 'dairy' };
      return { subcategory: 'low_fat_dairy', role: 'dairy' };
    }
    case 'vegetables': {
      if (
        d.includes('spinach') ||
        d.includes('lettuce') ||
        d.includes('kale') ||
        d.includes('chard')
      )
        return { subcategory: 'leafy_vegetables', role: 'vegetable' };
      if (
        d.includes('broccoli') ||
        d.includes('cabbage') ||
        d.includes('cauliflower') ||
        d.includes('brussels')
      )
        return { subcategory: 'cruciferous_vegetables', role: 'vegetable' };
      if (d.includes('potato') || d.includes('corn') || d.includes('squash'))
        return { subcategory: 'starchy_vegetables', role: 'vegetable' };
      return { subcategory: 'other_vegetables', role: 'vegetable' };
    }
    case 'fruits': {
      if (d.includes('dried') || d.includes('raisin'))
        return { subcategory: 'dried_fruit', role: 'fruit' };
      return { subcategory: 'fresh_fruit', role: 'fruit' };
    }
    case 'grains': {
      if (d.includes('white') || d.includes('refined') || d.includes('sugary'))
        return { subcategory: 'simple_carbs', role: 'simple_carb' };
      return { subcategory: 'complex_carbs', role: 'complex_carb' };
    }
    case 'legumes': {
      if (d.includes('lentil') || d.includes('pea'))
        return { subcategory: 'lentils_and_peas', role: 'plant_protein' };
      return { subcategory: 'beans', role: 'plant_protein' };
    }
    case 'nuts': {
      if (d.includes('seed'))
        return { subcategory: 'seeds', role: 'healthy_fat' };
      return { subcategory: 'tree_nuts', role: 'healthy_fat' };
    }
    case 'oils': {
      if (
        d.includes('palm') ||
        d.includes('coconut') ||
        d.includes('butter') ||
        d.includes('lard')
      )
        return { subcategory: 'saturated_oils', role: 'saturated_fat' };
      return { subcategory: 'healthy_oils', role: 'healthy_fat' };
    }
    case 'eggs': {
      if (d.includes('white') && !d.includes('whole'))
        return { subcategory: 'egg_whites', role: 'lean_protein' };
      return { subcategory: 'whole_eggs', role: 'lean_protein' };
    }
    default:
      return null;
  }
}

async function fetchUsdaCategory(
  category: string,
  query: string,
  apiKey: string,
): Promise<CuratedItem[]> {
  const url =
    `${USDA_BASE_URL}?api_key=${apiKey}&query=${encodeURIComponent(query)}` +
    `&dataType=Foundation,SR%20Legacy&pageSize=${ITEMS_PER_CATEGORY * 2}`;
  const res = await fetchWithRetry(url);
  const data = (await res.json()) as UsdaSearchResponse;

  const items: CuratedItem[] = [];
  const seenNames = new Set<string>();

  for (const food of data.foods) {
    if (items.length >= ITEMS_PER_CATEGORY) break;
    const name = food.description?.trim();
    if (!name || seenNames.has(name.toLowerCase())) continue;

    const nutrient = (id: number) =>
      food.foodNutrients.find((n) => n.nutrientId === id)?.value;
    const calories = nutrient(USDA_NUTRIENT_IDS.energy);
    const protein = nutrient(USDA_NUTRIENT_IDS.protein);
    const carbs = nutrient(USDA_NUTRIENT_IDS.carbs);
    const fat = nutrient(USDA_NUTRIENT_IDS.fat);
    if (
      calories === undefined ||
      protein === undefined ||
      carbs === undefined ||
      fat === undefined
    )
      continue;

    const classification = resolveUsdaClassification(category, name);
    if (!classification) continue;

    seenNames.add(name.toLowerCase());
    items.push({
      name,
      category,
      subcategory: classification.subcategory,
      role: classification.role,
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      source: 'usda',
      sourceId: String(food.fdcId),
    });
  }

  return items;
}

// ---------------------------------------------------------------------
// DeepL translation - free-tier keys end in ":fx" and must hit the
// api-free host, per DeepL's own account-tier routing convention.
// ---------------------------------------------------------------------

// The free tier enforces a per-second request rate - a tight loop over
// hundreds of (item, locale) pairs empirically hits 429s well before any
// monthly character quota, so this retries on 429 with backoff on top of
// the fixed inter-call delay in translateMissing below.
async function translate(
  text: string,
  targetLocale: string,
  apiKey: string,
  attempts = 5,
): Promise<string> {
  const host = apiKey.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        target_lang: targetLocale.toUpperCase(),
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { translations: { text: string }[] };
      return data.translations[0].text;
    }
    if (res.status === 429 && attempt < attempts) {
      await new Promise((r) => setTimeout(r, attempt * 5000));
      continue;
    }
    throw new Error(`DeepL request failed: ${res.status}`);
  }
  throw new Error('DeepL request failed: exhausted retries');
}

// ---------------------------------------------------------------------
// Insert + translate
// ---------------------------------------------------------------------

async function insertItem(
  db: Db,
  item: CuratedItem,
  ids: Awaited<ReturnType<typeof upsertTaxonomy>>,
): Promise<{
  foodCalorieId: string;
  inserted: boolean;
  imageBackfilled: boolean;
}> {
  const categoryId = ids.categoryIds.get(item.category)!;
  const subcategoryId = ids.subcategoryIds.get(item.subcategory)!;
  const roleId = ids.roleIds.get(item.role)!;

  const values = {
    name: item.name,
    categoryId,
    subcategoryId,
    roleId,
    caloriesPer100g: String(item.caloriesPer100g),
    proteinPer100g: String(item.proteinPer100g),
    carbsPer100g: String(item.carbsPer100g),
    fatPer100g: String(item.fatPer100g),
    source: item.source,
    sourceId: item.sourceId,
    imageUrl: item.imageUrl,
  };
  const target = [schema.foodCalories.source, schema.foodCalories.sourceId];
  // `xmax = 0` is Postgres's own tell for "this returned row came from the
  // INSERT branch, not an ON CONFLICT UPDATE" - lets one round-trip cover
  // both the insert and the conflict-update case below instead of a
  // separate follow-up query to tell them apart.
  const returningInsertedFlag = {
    id: schema.foodCalories.id,
    isFreshInsert: sql<boolean>`(xmax = 0)`,
  };

  // Only reaches for a write when there's an image to offer at all - a
  // conflicting row's image_url is set exactly when it's currently null
  // (setWhere), so the null-check and the write happen in the same
  // statement: no read-then-write gap, and an already-imaged row, a
  // human-verified row, or its macros/classification are never touched.
  const [row] = item.imageUrl
    ? await db
        .insert(schema.foodCalories)
        .values(values)
        .onConflictDoUpdate({
          target,
          set: { imageUrl: item.imageUrl },
          setWhere: isNull(schema.foodCalories.imageUrl),
        })
        .returning(returningInsertedFlag)
    : await db
        .insert(schema.foodCalories)
        .values(values)
        .onConflictDoNothing({ target })
        .returning(returningInsertedFlag);

  if (row) {
    return {
      foodCalorieId: row.id,
      inserted: row.isFreshInsert,
      imageBackfilled: !row.isFreshInsert,
    };
  }

  // Conflicted but nothing changed - either there was no image to offer, or
  // the existing row already had one. Just need its id for the caller.
  const existing = await db.query.foodCalories.findFirst({
    where: and(
      eq(schema.foodCalories.source, item.source),
      eq(schema.foodCalories.sourceId, item.sourceId),
    ),
  });
  return {
    foodCalorieId: existing!.id,
    inserted: false,
    imageBackfilled: false,
  };
}

// Fixed spacing between calls, on top of translate()'s own 429 backoff -
// staying under the free tier's per-second rate proactively rather than
// relying solely on reacting to 429s after the fact.
const DEEPL_CALL_DELAY_MS = 250;

async function translateMissing(db: Db, apiKey: string) {
  const untranslated = await db.query.foodCalories.findMany();

  let translated = 0;
  let failed = 0;
  for (const item of untranslated) {
    for (const locale of DEEPL_TARGET_LOCALES) {
      const existing = await db.query.foodCalorieTranslations.findFirst({
        where: and(
          eq(schema.foodCalorieTranslations.foodCalorieId, item.id),
          eq(schema.foodCalorieTranslations.locale, locale),
        ),
      });
      if (existing) continue;

      try {
        const name = await translate(item.name, locale, apiKey);
        await db
          .insert(schema.foodCalorieTranslations)
          .values({ foodCalorieId: item.id, locale, name })
          .onConflictDoNothing({
            target: [
              schema.foodCalorieTranslations.foodCalorieId,
              schema.foodCalorieTranslations.locale,
            ],
          });
        translated++;
      } catch (err) {
        // One stubborn pair shouldn't sink the whole batch - a re-run
        // picks up anything left untranslated (existing-row check above).
        console.warn(
          `DeepL: giving up on "${item.name}" -> ${locale} (${String(err)})`,
        );
        failed++;
      }
      await new Promise((r) => setTimeout(r, DEEPL_CALL_DELAY_MS));
    }
  }
  if (failed > 0)
    console.warn(`DeepL: ${failed} pair(s) failed, re-run to retry.`);
  return translated;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const ids = await upsertTaxonomy(db);

  let imported = 0;
  let skippedExisting = 0;
  let imagesBackfilled = 0;

  for (const [category, offTag] of Object.entries(OFF_CATEGORY_TAGS)) {
    const items = await fetchOffCategory(category, offTag);
    for (const item of items) {
      const result = await insertItem(db, item, ids);
      if (result.inserted) imported++;
      else skippedExisting++;
      if (result.imageBackfilled) imagesBackfilled++;
    }
  }
  console.log(
    `Open Food Facts: imported ${imported}, already present ${skippedExisting}, ` +
      `images backfilled on ${imagesBackfilled} existing row(s).`,
  );

  const usdaApiKey = process.env.USDA_API_KEY;
  if (!usdaApiKey) {
    console.warn(
      'USDA_API_KEY not set - skipping USDA FoodData Central import.',
    );
  } else {
    let usdaImported = 0;
    let usdaSkipped = 0;
    for (const { category, query } of USDA_QUERIES) {
      const items = await fetchUsdaCategory(category, query, usdaApiKey);
      for (const item of items) {
        const result = await insertItem(db, item, ids);
        if (result.inserted) usdaImported++;
        else usdaSkipped++;
      }
    }
    console.log(
      `USDA FoodData Central: imported ${usdaImported}, already present ${usdaSkipped}.`,
    );
  }

  const deeplApiKey = process.env.DEEPL_API_KEY;
  if (!deeplApiKey) {
    console.warn('DEEPL_API_KEY not set - skipping per-locale translation.');
  } else {
    const translated = await translateMissing(db, deeplApiKey);
    console.log(`Translated ${translated} (food item, locale) pairs.`);
  }

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
