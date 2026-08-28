import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, lt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { decodeCursor, encodeCursor } from '../admin/cursor-pagination';
import type { CreateExerciseDto } from './dto/create-exercise.dto';
import type { ListExercisesDto } from './dto/list-exercises.dto';
import { toExerciseResponse, type ExerciseResponse } from './exercise.mapper';

const DEFAULT_LOCALE = 'en';
const DEFAULT_LIMIT = 20;

export interface ExercisePage {
  items: ExerciseResponse[];
  nextCursor: string | null;
}

// Shared column projection for both list()'s select and create()'s
// insert().returning() - keeps them from drifting apart.
const exerciseColumns = {
  id: schema.exercises.id,
  name: schema.exercises.name,
  category: schema.exercises.category,
  imageUrl: schema.exercises.imageUrl,
  isVerified: schema.exercises.isVerified,
  createdAt: schema.exercises.createdAt,
};

@Injectable()
export class ExercisesService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // Falls back to 'en' if the profile row is somehow missing - shouldn't
  // happen behind the profile-completion gate, but list() shouldn't 500 over it.
  private async resolveLocale(userId: string): Promise<string> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { locale: true },
    });
    return user?.locale ?? DEFAULT_LOCALE;
  }

  // Search matches either the base English name or the joined translated
  // name - a non-English user typing what they see on screen should still
  // find it.
  async list(userId: string, params: ListExercisesDto): Promise<ExercisePage> {
    const locale = await this.resolveLocale(userId);
    const limit = params.limit ?? DEFAULT_LIMIT;
    const cursor = params.cursor ? decodeCursor(params.cursor) : null;
    if (params.cursor && !cursor) {
      throw new BadRequestException('Invalid cursor');
    }

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
          eq(schema.exercises.isVerified, true),
          params.category
            ? eq(schema.exercises.category, params.category)
            : undefined,
          params.search
            ? or(
                ilike(schema.exercises.name, `%${params.search}%`),
                ilike(schema.exerciseTranslations.name, `%${params.search}%`),
              )
            : undefined,
          cursor
            ? or(
                lt(schema.exercises.createdAt, new Date(cursor.createdAt)),
                and(
                  eq(schema.exercises.createdAt, new Date(cursor.createdAt)),
                  lt(schema.exercises.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      // Newest-first so a just-created Exercise lands on page one.
      .orderBy(desc(schema.exercises.createdAt), desc(schema.exercises.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map((row) =>
        toExerciseResponse({ ...row, name: row.translatedName ?? row.name }),
      ),
      nextCursor:
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  // isVerified: true - a manually-created Exercise is implicitly
  // self-reviewed by its creator, unlike an imported seed row.
  async create(dto: CreateExerciseDto): Promise<ExerciseResponse> {
    const [inserted] = await this.db
      .insert(schema.exercises)
      .values({
        name: dto.name,
        category: dto.category,
        isVerified: true,
      })
      .returning(exerciseColumns);

    return toExerciseResponse(inserted);
  }
}
