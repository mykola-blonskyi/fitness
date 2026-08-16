import { dailyLogs } from '../db/schema';

export type DailyLogRow = typeof dailyLogs.$inferSelect;

export interface DailyLogResponse {
  id: string;
  date: string;
  weight: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toDailyLogResponse(row: DailyLogRow): DailyLogResponse {
  return {
    id: row.id,
    date: row.date,
    weight: row.weight === null ? null : Number(row.weight),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
