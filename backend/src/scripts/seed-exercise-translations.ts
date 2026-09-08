// Ukrainian and Russian names for the wger-imported exercise catalog, applied
// on top of what seed-exercises.ts pulls from wger itself. wger's community
// ships ~620 Spanish names but only a dozen uk/ru ones, so those two locales
// were effectively English in the UI; these are translated in-house instead
// (knowledge/glossary.md "UI terminology per locale" - a general-purpose
// translator renders "Log set" as «Набір колод», a bundle of timber).
//
// Run manually, after seed-exercises.ts:
//   pnpm --filter backend db:seed:exercise-translations
// Safe to re-run: rows are upserted on (exerciseId, locale). Keyed by wger id
// rather than exercises.id, which is regenerated whenever the table is rebuilt.
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import translations from './data/exercise-translations.uk-ru.json';

export interface ExerciseTranslation {
  en: string;
  uk: string;
  ru: string;
}

const WGER_SOURCE = 'wger';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  let applied = 0;
  let missing = 0;

  for (const [sourceId, names] of Object.entries(
    translations as Record<string, ExerciseTranslation>,
  )) {
    const [exercise] = await db
      .select({ id: schema.exercises.id })
      .from(schema.exercises)
      .where(
        and(
          eq(schema.exercises.source, WGER_SOURCE),
          eq(schema.exercises.sourceId, sourceId),
        ),
      )
      .limit(1);

    if (!exercise) {
      missing++;
      continue;
    }

    for (const locale of ['uk', 'ru'] as const) {
      await db
        .insert(schema.exerciseTranslations)
        .values({ exerciseId: exercise.id, locale, name: names[locale] })
        .onConflictDoUpdate({
          target: [
            schema.exerciseTranslations.exerciseId,
            schema.exerciseTranslations.locale,
          ],
          set: { name: names[locale] },
        });
      applied++;
    }
  }

  console.log(
    `Done. Applied ${applied} translations, ${missing} exercises not in the database.`,
  );
  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
