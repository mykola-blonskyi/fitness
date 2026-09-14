import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, gt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import * as schema from '../../db/schema';
import { checkDeleteGuard } from '../delete-guard';
import { decodeCursor, encodeCursor } from '../cursor-pagination';
import type { ListAdminExercisesDto } from './dto/list-admin-exercises.dto';
import {
  toAdminExerciseResponse,
  type AdminExerciseResponse,
} from './admin-exercise.mapper';

const DEFAULT_LIMIT = 20;

export interface AdminExercisePage {
  items: AdminExerciseResponse[];
  nextCursor: string | null;
}

const exerciseColumns = {
  id: schema.exercises.id,
  name: schema.exercises.name,
  category: schema.exercises.category,
  imageUrl: schema.exercises.imageUrl,
  isVerified: schema.exercises.isVerified,
  source: schema.exercises.source,
  sourceId: schema.exercises.sourceId,
  createdAt: schema.exercises.createdAt,
};

@Injectable()
export class AdminExercisesService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // Ordered oldest-queued-first (createdAt, id ASC) - a plain moderation
  // FIFO. Fetches one extra row to know whether a next page exists without
  // a separate count query.
  async list(query: ListAdminExercisesDto): Promise<AdminExercisePage> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    if (query.cursor && !cursor) {
      throw new BadRequestException('Invalid cursor');
    }

    const rows = await this.db
      .select(exerciseColumns)
      .from(schema.exercises)
      .where(
        and(
          eq(schema.exercises.isVerified, false),
          cursor
            ? or(
                gt(schema.exercises.createdAt, new Date(cursor.createdAt)),
                and(
                  eq(schema.exercises.createdAt, new Date(cursor.createdAt)),
                  gt(schema.exercises.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(asc(schema.exercises.createdAt), asc(schema.exercises.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map(toAdminExerciseResponse),
      nextCursor:
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  async setVerified(
    id: string,
    isVerified: boolean,
  ): Promise<AdminExerciseResponse> {
    const [updated] = await this.db
      .update(schema.exercises)
      .set({ isVerified })
      .where(eq(schema.exercises.id, id))
      .returning(exerciseColumns);

    if (!updated) {
      throw new NotFoundException('Exercise not found');
    }
    return toAdminExerciseResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db.query.exercises.findFirst({
      where: eq(schema.exercises.id, id),
      columns: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Exercise not found');
    }

    const [[{ value: programExerciseCount }], [{ value: workoutSetCount }]] =
      await Promise.all([
        this.db
          .select({ value: count() })
          .from(schema.programExercises)
          .where(eq(schema.programExercises.exerciseId, id)),
        this.db
          .select({ value: count() })
          .from(schema.workoutSets)
          .where(eq(schema.workoutSets.exerciseId, id)),
      ]);

    const guard = checkDeleteGuard(
      'exercise',
      'reference',
      programExerciseCount + workoutSetCount,
    );
    if (!guard.allowed) {
      throw new ConflictException(guard.reason);
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.exerciseTranslations)
        .where(eq(schema.exerciseTranslations.exerciseId, id));
      await tx.delete(schema.exercises).where(eq(schema.exercises.id, id));
    });
  }
}
