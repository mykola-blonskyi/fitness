import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import type { CreateExerciseDto } from './dto/create-exercise.dto';
import type { ListExercisesDto } from './dto/list-exercises.dto';
import { toExerciseResponse, type ExerciseResponse } from './exercise.mapper';

const DEFAULT_LOCALE = 'en';

// Shared column projection for both list()'s select and create()'s
// insert().returning() - one place to add a new exercises column so it
// can't go missing from just one of the two call sites (same convention
// as food-items.service.ts's foodItemColumns, though unlike that one,
// create() here returns straight from the insert - no post-insert
// re-select needed, since exercises has no joined taxonomy columns to
// resolve).
const exerciseColumns = {
  id: schema.exercises.id,
  name: schema.exercises.name,
  category: schema.exercises.category,
  imageUrl: schema.exercises.imageUrl,
  isVerified: schema.exercises.isVerified,
};

@Injectable()
export class ExercisesService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // Resolves the caller's stored locale preference (users.locale - see
  // schema.ts's comment on that column). Deliberately NOT a `locale`
  // query param the client passes, unlike food-items.service.ts's list()
  // - that endpoint resolves locale from next-intl's future route segment,
  // which doesn't exist yet (FITNESS-11) and isn't what "current UI
  // locale" should mean architecturally. Falls back to 'en' if the
  // profile row is somehow missing (shouldn't happen behind the
  // profile-completion gate, but list() shouldn't 500 over it).
  private async resolveLocale(userId: string): Promise<string> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { locale: true },
    });
    return user?.locale ?? DEFAULT_LOCALE;
  }

  // Browse by category and/or search by name, with each item's display
  // name resolved to the caller's locale - falling back to the English
  // base name when no translation row exists yet (untranslated, or the
  // locale itself is 'en', which never gets its own translation row - see
  // knowledge/domain-model.md). Search matches either the base English
  // name or the already-joined translated name, not just the base name -
  // a non-English-locale user typing what they see on screen (the
  // translated name) should still find it.
  async list(
    userId: string,
    params: ListExercisesDto,
  ): Promise<ExerciseResponse[]> {
    const locale = await this.resolveLocale(userId);

    const rows = await this.db
      .select({
        ...exerciseColumns,
        translatedName: schema.exerciseTranslations.name,
      })
      .from(schema.exercises)
      .leftJoin(
        schema.exerciseTranslations,
        and(
          eq(schema.exerciseTranslations.exerciseId, schema.exercises.id),
          eq(schema.exerciseTranslations.locale, locale),
        ),
      )
      .where(
        and(
          params.category
            ? eq(schema.exercises.category, params.category)
            : undefined,
          params.search
            ? or(
                ilike(schema.exercises.name, `%${params.search}%`),
                ilike(schema.exerciseTranslations.name, `%${params.search}%`),
              )
            : undefined,
        ),
      )
      .orderBy(schema.exercises.name);

    return rows.map((row) =>
      toExerciseResponse({ ...row, name: row.translatedName ?? row.name }),
    );
  }

  // source/sourceId stay null (unlike seeded rows) and isVerified stays
  // at its schema default (false) - same convention as
  // food-items.service.ts's create().
  async create(dto: CreateExerciseDto): Promise<ExerciseResponse> {
    const [inserted] = await this.db
      .insert(schema.exercises)
      .values({
        name: dto.name,
        category: dto.category,
      })
      .returning(exerciseColumns);

    return toExerciseResponse(inserted);
  }
}
