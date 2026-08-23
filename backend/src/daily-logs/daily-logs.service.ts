import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, isNotNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import {
  DailyLogResponse,
  WeightTrendPoint,
  toDailyLogResponse,
} from './daily-log.mapper';

@Injectable()
export class DailyLogsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async findByDate(
    userId: string,
    date: string,
  ): Promise<DailyLogResponse | null> {
    const row = await this.db.query.dailyLogs.findFirst({
      where: and(
        eq(schema.dailyLogs.userId, userId),
        eq(schema.dailyLogs.date, date),
      ),
    });
    return row ? toDailyLogResponse(row) : null;
  }

  // Used by calorie-targets, which needs a real weigh-in and can't fall
  // back to a date with weight left null.
  async findLatestWeighIn(userId: string): Promise<DailyLogResponse | null> {
    const row = await this.db.query.dailyLogs.findFirst({
      where: and(
        eq(schema.dailyLogs.userId, userId),
        isNotNull(schema.dailyLogs.weight),
      ),
      orderBy: desc(schema.dailyLogs.date),
    });
    return row ? toDailyLogResponse(row) : null;
  }

  // Lazily creates the Daily Log row, leaving weight null - so generating a
  // menu never requires a weigh-in on that specific date.
  async findOrCreate(userId: string, date: string): Promise<DailyLogResponse> {
    await this.db
      .insert(schema.dailyLogs)
      .values({ userId, date })
      .onConflictDoNothing({
        target: [schema.dailyLogs.userId, schema.dailyLogs.date],
      });

    const row = await this.db.query.dailyLogs.findFirst({
      where: and(
        eq(schema.dailyLogs.userId, userId),
        eq(schema.dailyLogs.date, date),
      ),
    });
    // Unreachable in practice - the insert above guarantees the row
    // exists by the time this query runs.
    if (!row) {
      throw new NotFoundException('Failed to resolve Daily Log');
    }
    return toDailyLogResponse(row);
  }

  async setWeight(
    userId: string,
    date: string,
    weight: number,
  ): Promise<DailyLogResponse> {
    const [row] = await this.db
      .insert(schema.dailyLogs)
      .values({ userId, date, weight: weight.toString() })
      .onConflictDoUpdate({
        target: [schema.dailyLogs.userId, schema.dailyLogs.date],
        set: { weight: weight.toString(), updatedAt: new Date() },
      })
      .returning();

    return toDailyLogResponse(row);
  }

  async clearWeight(userId: string, date: string): Promise<DailyLogResponse> {
    const existing = await this.db.query.dailyLogs.findFirst({
      where: and(
        eq(schema.dailyLogs.userId, userId),
        eq(schema.dailyLogs.date, date),
      ),
    });
    if (!existing) {
      throw new NotFoundException('No Daily Log for this date');
    }

    const [row] = await this.db
      .update(schema.dailyLogs)
      .set({ weight: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.dailyLogs.userId, userId),
          eq(schema.dailyLogs.date, date),
        ),
      )
      .returning();

    return toDailyLogResponse(row);
  }

  // Days with no row or a null weight are simply absent - the frontend
  // renders that as a gap rather than interpolating.
  async getWeightTrend(
    userId: string,
    days: number,
  ): Promise<WeightTrendPoint[]> {
    const today = new Date();
    const since = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - (days - 1),
      ),
    );
    const sinceDate = since.toISOString().slice(0, 10);

    const rows = await this.db.query.dailyLogs.findMany({
      where: and(
        eq(schema.dailyLogs.userId, userId),
        isNotNull(schema.dailyLogs.weight),
        gte(schema.dailyLogs.date, sinceDate),
      ),
      orderBy: asc(schema.dailyLogs.date),
    });

    // weight is non-null by construction of the WHERE clause above - the
    // schema still types it nullable, hence the assertion rather than a
    // redundant runtime check.
    return rows.map((row) => ({
      date: row.date,
      weight: Number(row.weight!),
    }));
  }
}
