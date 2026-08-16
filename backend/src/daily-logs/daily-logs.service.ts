import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { DailyLogResponse, toDailyLogResponse } from './daily-log.mapper';

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

  // Creates the Daily Log row on first write for this (user, date) or
  // updates the existing one — never a duplicate, enforced by the
  // unique(user_id, date) constraint via an atomic upsert.
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

  // Clears the weight value but leaves the Daily Log row itself in
  // place, available for other attachments (workout logs, diets, etc.)
  // on the same date.
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
}
