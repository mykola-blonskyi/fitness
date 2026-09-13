// Measures generated-plan quality against the real catalog, reproducing
// ADR-019's methodology (300 randomised menus per meal count) so a change to
// the generator can be compared against a committed baseline rather than a
// remembered one. Picking is seeded, so two runs of the same code agree.
//   pnpm --filter backend exec ts-node -r tsconfig-paths/register \
//     src/scripts/diet-quality-harness.ts [menus-per-count]
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';
import { generateDietItems } from '../diets/greedy-heuristic';
import { freeFoodPortion } from '../diets/free-foods';
import {
  MEAL_ROLE_CHAINS,
  type FoodCandidate,
  type GeneratedDiet,
} from '../diets/diet.types';

const MEAL_COUNTS = [3, 4, 5, 6];

// The moderate profile is macro-consistent (P*4 + C*4 + F*9 == calories).
// The second is the extreme one ADR-019 reports its misses against, where
// the protein target alone cannot be met by one portion of one food.
const PROFILES = [
  {
    label: 'moderate 180P',
    targetCalories: 2463,
    targetProteinG: 180,
    targetCarbsG: 300,
    targetFatG: 60,
  },
  {
    label: 'ADR-019 310P',
    targetCalories: 2463,
    targetProteinG: 310,
    targetCarbsG: 246,
    targetFatG: 68,
  },
];
type Profile = (typeof PROFILES)[number];
const SEED = Number(process.env.SEED ?? 20260912);

function seededPick(seed: number) {
  let state = seed;
  return <T>(items: T[]): T => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return items[state % items.length];
  };
}

interface CatalogRow {
  id: string;
  role: string;
  family: string | null;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

async function loadCatalog(
  db: ReturnType<typeof drizzle<typeof schema>>,
): Promise<CatalogRow[]> {
  const roleNames = [...new Set(MEAL_ROLE_CHAINS.flat())];
  const roles = await db
    .select({ id: schema.foodRoles.id, name: schema.foodRoles.name })
    .from(schema.foodRoles)
    .where(inArray(schema.foodRoles.name, roleNames));
  const roleNameById = new Map(roles.map((r) => [r.id, r.name]));

  const rows = await db
    .select({
      id: schema.foodCalories.id,
      roleId: schema.foodCalories.roleId,
      name: schema.foodCalories.name,
      family: schema.foodFamilies.name,
      caloriesPer100g: schema.foodCalories.caloriesPer100g,
      proteinPer100g: schema.foodCalories.proteinPer100g,
      carbsPer100g: schema.foodCalories.carbsPer100g,
      fatPer100g: schema.foodCalories.fatPer100g,
    })
    .from(schema.foodCalories)
    .leftJoin(
      schema.foodFamilies,
      eq(schema.foodCalories.familyId, schema.foodFamilies.id),
    )
    .where(inArray(schema.foodCalories.roleId, [...roleNameById.keys()]));

  return rows
    .filter((r) => Number(r.caloriesPer100g) > 0)
    .map((r) => ({
      id: r.id,
      role: roleNameById.get(r.roleId)!,
      family: r.family,
      name: r.name,
      caloriesPer100g: Number(r.caloriesPer100g),
      proteinPer100g: Number(r.proteinPer100g),
      carbsPer100g: Number(r.carbsPer100g),
      fatPer100g: Number(r.fatPer100g),
    }));
}

function candidatesByRole(catalog: CatalogRow[]): Map<string, FoodCandidate[]> {
  const byRole = new Map<string, FoodCandidate[]>();
  for (const role of new Set(MEAL_ROLE_CHAINS.flat())) byRole.set(role, []);
  for (const row of catalog) {
    byRole.get(row.role)?.push({
      id: row.id,
      familyName: row.family,
      caloriesPer100g: row.caloriesPer100g,
      proteinPer100g: row.proteinPer100g,
      carbsPer100g: row.carbsPer100g,
      fatPer100g: row.fatPer100g,
    });
  }
  return byRole;
}

export interface QualityStats {
  mealCount: number;
  menus: number;
  signed: { protein: number; carbs: number; fat: number };
  absolute: { protein: number; carbs: number; fat: number };
  worst: { protein: number; carbs: number; fat: number };
  overCeiling: number;
  daysWithRepeat: number;
  worstRepeat: number;
  daysOverProteinFamilyCap: number;
  worstProteinFamilyMeals: number;
  emptyDays: number;
  saladMeals: number;
  saladsUnder2Bulk: number;
  saladsWithAccent: number;
}

function plateTotals(
  diet: GeneratedDiet,
  candidateById: Map<string, FoodCandidate>,
) {
  const sum = (per100g: (candidate: FoodCandidate) => number) =>
    diet.items.reduce(
      (total, item) =>
        total +
        (per100g(candidateById.get(item.foodItemId)!) * item.weightGrams) / 100,
      0,
    );
  return {
    calories: sum((c) => c.caloriesPer100g),
    protein: sum((c) => c.proteinPer100g),
    carbs: sum((c) => c.carbsPer100g),
    fat: sum((c) => c.fatPer100g),
  };
}

export function measure(
  diets: GeneratedDiet[],
  mealCount: number,
  target: Profile,
  candidateById: Map<string, FoodCandidate>,
  proteinItemIds: Set<string>,
): QualityStats {
  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const max = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);

  const plates = diets.map((d) => plateTotals(d, candidateById));
  const dp = plates.map((p) => p.protein - target.targetProteinG);
  const dc = plates.map((p) => p.carbs - target.targetCarbsG);
  const df = plates.map((p) => p.fat - target.targetFatG);

  let daysWithRepeat = 0;
  let worstRepeat = 0;
  let daysOverCap = 0;
  let worstFamilyMeals = 0;
  let emptyDays = 0;
  let saladMeals = 0;
  let saladsUnder2Bulk = 0;
  let saladsWithAccent = 0;

  for (const diet of diets) {
    if (diet.items.length === 0) emptyDays++;
    const perItem = new Map<string, number>();
    for (const item of diet.items)
      perItem.set(item.foodItemId, (perItem.get(item.foodItemId) ?? 0) + 1);
    const repeat = max([...perItem.values()]);
    if (repeat > 1) daysWithRepeat++;
    worstRepeat = Math.max(worstRepeat, repeat);

    const mealsByFamily = new Map<string, Set<number>>();
    for (const item of diet.items) {
      if (!proteinItemIds.has(item.foodItemId)) continue;
      const family = candidateById.get(item.foodItemId)?.familyName;
      if (!family) continue;
      const meals = mealsByFamily.get(family) ?? new Set<number>();
      meals.add(item.mealPosition);
      mealsByFamily.set(family, meals);
    }
    const worst = max([...mealsByFamily.values()].map((s) => s.size));
    if (worst > 2) daysOverCap++;
    worstFamilyMeals = Math.max(worstFamilyMeals, worst);

    const saladsByMeal = new Map<number, string[]>();
    for (const item of diet.items) {
      if (item.isCounted) continue;
      const family = candidateById.get(item.foodItemId)?.familyName ?? null;
      const portion = freeFoodPortion(family);
      if (portion === null) continue;
      const salad = saladsByMeal.get(item.mealPosition) ?? [];
      salad.push(portion);
      saladsByMeal.set(item.mealPosition, salad);
    }
    for (const salad of saladsByMeal.values()) {
      saladMeals++;
      if (salad.filter((p) => p === 'bulk').length < 2) saladsUnder2Bulk++;
      if (salad.includes('accent')) saladsWithAccent++;
    }
  }

  return {
    mealCount,
    menus: diets.length,
    signed: { protein: mean(dp), carbs: mean(dc), fat: mean(df) },
    absolute: {
      protein: mean(dp.map(Math.abs)),
      carbs: mean(dc.map(Math.abs)),
      fat: mean(df.map(Math.abs)),
    },
    worst: {
      protein: max(dp.map(Math.abs)),
      carbs: max(dc.map(Math.abs)),
      fat: max(df.map(Math.abs)),
    },
    overCeiling: plates.filter((p) => p.calories > target.targetCalories)
      .length,
    daysWithRepeat,
    worstRepeat,
    daysOverProteinFamilyCap: daysOverCap,
    worstProteinFamilyMeals: worstFamilyMeals,
    emptyDays,
    saladMeals,
    saladsUnder2Bulk,
    saladsWithAccent,
  };
}

async function main() {
  const menus = Number(process.argv[2] ?? 300);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const catalog = await loadCatalog(db);
  const byRole = candidatesByRole(catalog);
  const familyOnly = candidatesByRole(catalog.filter((r) => r.family));
  const candidateById = new Map(
    [...byRole.values()].flat().map((c) => [c.id, c] as const),
  );
  const proteinRoles = new Set(MEAL_ROLE_CHAINS[0]);
  const proteinItemIds = new Set(
    catalog.filter((r) => proteinRoles.has(r.role)).map((r) => r.id),
  );

  console.log(
    `catalog: ${catalog.length} candidates, ` +
      `${catalog.filter((r) => r.family).length} with a Family; seed ${SEED}`,
  );
  for (const role of [...byRole.keys()].sort())
    console.log(
      `  ${role.padEnd(16)} ${String(byRole.get(role)!.length).padStart(4)} ` +
        `${String(familyOnly.get(role)!.length).padStart(4)} with a Family`,
    );

  const header = [
    'meals',
    'dP',
    'dC',
    'dF',
    '|dP|',
    '|dC|',
    '|dF|',
    'wP',
    'wC',
    'wF',
    'over',
    'repDays',
    'wRep',
    'famDays',
    'wFam',
    'empty',
    'salads',
    'lt2bulk',
    'accent',
  ];

  for (const profile of PROFILES) {
    for (const [poolLabel, pool] of [
      ['whole catalog', byRole],
      ['Family-carrying only', familyOnly],
    ] as const) {
      console.log(
        `\n=== ${profile.label} / ${poolLabel} / ${menus} menus per count ===`,
      );
      console.log(header.join('\t'));
      for (const mealCount of MEAL_COUNTS) {
        const pick = seededPick(SEED + mealCount);
        const diets = Array.from({ length: menus }, () =>
          generateDietItems({
            ...profile,
            mealCount,
            candidatesByRole: pool,
            pickRandom: pick,
          }),
        );
        const s = measure(
          diets,
          mealCount,
          profile,
          candidateById,
          proteinItemIds,
        );
        const f = (n: number) => n.toFixed(1);
        console.log(
          [
            s.mealCount,
            f(s.signed.protein),
            f(s.signed.carbs),
            f(s.signed.fat),
            f(s.absolute.protein),
            f(s.absolute.carbs),
            f(s.absolute.fat),
            f(s.worst.protein),
            f(s.worst.carbs),
            f(s.worst.fat),
            s.overCeiling,
            s.daysWithRepeat,
            s.worstRepeat,
            s.daysOverProteinFamilyCap,
            s.worstProteinFamilyMeals,
            s.emptyDays,
            s.saladMeals,
            s.saladsUnder2Bulk,
            s.saladsWithAccent,
          ].join('\t'),
        );
      }
    }
  }

  console.log(
    '\nEvery macro column measures the whole plate - counted items plus the\n' +
      'Free Foods a Diet leaves out of its stored totals - against the day target.\n' +
      'dP/dC/dF mean signed delta, |d*| mean absolute, w* worst absolute (grams).\n' +
      'over = menus above the calorie ceiling. repDays = days repeating a Food Item,\n' +
      'wRep = worst repeat count. famDays = days with >2 meals from one protein\n' +
      'Family, wFam = worst such count. empty = days that generated nothing.\n' +
      'salads = meals served a Free Food, lt2bulk = those with fewer than two\n' +
      'bulk items (ADR-020 requires none), accent = those with an accent item.',
  );

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
