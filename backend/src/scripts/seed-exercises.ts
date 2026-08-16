// One-time curated import from wger into the exercises table (FITNESS-16,
// knowledge/business-rules.md "Food/exercise data import"). Run manually:
//   pnpm --filter backend db:seed:exercises
// Safe to re-run: exercises are upserted on (source, sourceId), so an
// already-imported exercise is skipped rather than duplicated.
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';

const WGER_BASE_URL = 'https://wger.de/api/v2';
const PAGE_SIZE = 100;

// wger's own locale ids for the four languages this project supports.
// English is the base Exercise.name, not a translation row.
const WGER_LANGUAGE_TO_LOCALE: Record<number, 'uk' | 'ru' | 'es'> = {
  15: 'uk',
  5: 'ru',
  4: 'es',
};
const WGER_ENGLISH_LANGUAGE_ID = 2;

// Explicit source-category -> project-category mapping (business-rules.md
// requires this be explicit, not inferred). wger's "Arms" category doesn't
// distinguish biceps/triceps itself, so those two are resolved from the
// exercise's primary muscle instead - see resolveArmsCategory. wger has no
// category that maps to 'full_body': those stay manually-curated only.
const WGER_CATEGORY_TO_EXERCISE_CATEGORY: Record<
  number,
  (typeof schema.exerciseCategoryEnum.enumValues)[number] | 'arms'
> = {
  11: 'chest', // Chest
  12: 'back', // Back
  13: 'shoulders', // Shoulders
  14: 'legs', // Calves
  9: 'legs', // Legs
  10: 'core', // Abs
  15: 'cardio', // Cardio
  8: 'arms', // Arms - needs muscle-based disambiguation
};

const WGER_BICEPS_MUSCLE_IDS = new Set([1, 13]); // Biceps brachii, Brachialis
const WGER_TRICEPS_MUSCLE_IDS = new Set([5]); // Triceps brachii

interface WgerTranslation {
  name: string;
  language: number;
}

export interface WgerExerciseInfo {
  id: number;
  category: { id: number };
  muscles: { id: number }[];
  images: { image: string; is_main?: boolean }[];
  translations: WgerTranslation[];
}

interface WgerPage<T> {
  next: string | null;
  results: T[];
}

export function resolveArmsCategory(
  muscles: { id: number }[],
): (typeof schema.exerciseCategoryEnum.enumValues)[number] | null {
  if (muscles.some((m) => WGER_BICEPS_MUSCLE_IDS.has(m.id))) return 'biceps';
  if (muscles.some((m) => WGER_TRICEPS_MUSCLE_IDS.has(m.id))) return 'triceps';
  return null;
}

export function resolveCategory(
  info: WgerExerciseInfo,
): (typeof schema.exerciseCategoryEnum.enumValues)[number] | null {
  const mapped = WGER_CATEGORY_TO_EXERCISE_CATEGORY[info.category.id];
  if (!mapped) return null;
  if (mapped === 'arms') return resolveArmsCategory(info.muscles);
  return mapped;
}

async function* fetchAllExerciseInfo(): AsyncGenerator<WgerExerciseInfo> {
  let url: string | null =
    `${WGER_BASE_URL}/exerciseinfo/?limit=${PAGE_SIZE}&format=json`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`wger API request failed: ${res.status} ${url}`);
    }
    const page = (await res.json()) as WgerPage<WgerExerciseInfo>;
    for (const result of page.results) yield result;
    url = page.next;
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  let imported = 0;
  let skippedExisting = 0;
  let skippedUnmapped = 0;

  for await (const info of fetchAllExerciseInfo()) {
    const category = resolveCategory(info);
    if (!category) {
      skippedUnmapped++;
      continue;
    }

    const englishName = info.translations.find(
      (t) => t.language === WGER_ENGLISH_LANGUAGE_ID,
    )?.name;
    if (!englishName) {
      skippedUnmapped++;
      continue;
    }

    const sourceId = String(info.id);
    const imageUrl =
      info.images.find((img) => img.is_main)?.image ??
      info.images[0]?.image ??
      null;

    const [inserted] = await db
      .insert(schema.exercises)
      .values({
        name: englishName,
        imageUrl,
        category,
        source: 'wger',
        sourceId,
      })
      .onConflictDoNothing({
        target: [schema.exercises.source, schema.exercises.sourceId],
      })
      .returning();

    let exerciseId: string;
    if (inserted) {
      exerciseId = inserted.id;
      imported++;
    } else {
      const existing = await db.query.exercises.findFirst({
        where: and(
          eq(schema.exercises.source, 'wger'),
          eq(schema.exercises.sourceId, sourceId),
        ),
      });
      if (!existing) continue; // Conflict raced with a concurrent run - skip.
      exerciseId = existing.id;
      skippedExisting++;
    }

    for (const translation of info.translations) {
      const locale = WGER_LANGUAGE_TO_LOCALE[translation.language];
      if (!locale) continue;
      await db
        .insert(schema.exerciseTranslations)
        .values({ exerciseId, locale, name: translation.name })
        .onConflictDoNothing({
          target: [
            schema.exerciseTranslations.exerciseId,
            schema.exerciseTranslations.locale,
          ],
        });
    }
  }

  console.log(
    `Done. Imported ${imported}, already present ${skippedExisting}, unmapped/skipped ${skippedUnmapped}.`,
  );
  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
