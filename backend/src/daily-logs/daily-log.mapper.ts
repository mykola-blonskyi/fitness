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

// One point in the weight-trend chart (FITNESS-15) - always a real
// weigh-in, never a gap-filled/interpolated value. Missing days are
// simply absent from the array; the frontend renders the gap rather than
// connecting across it (see knowledge/business-rules.md and the
// FITNESS-3 spec's "Weight-trend queries" implementation decision).
export interface WeightTrendPoint {
  date: string;
  weight: number;
}
