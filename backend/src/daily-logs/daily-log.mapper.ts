import { dailyLogs } from '../db/schema';
import type { WeightUnit } from '../shared/weight-unit';

export type DailyLogRow = typeof dailyLogs.$inferSelect;

export interface DailyLogResponse {
  id: string;
  date: string;
  weight: number | null;
  weightUnit: WeightUnit | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toDailyLogResponse(row: DailyLogRow): DailyLogResponse {
  return {
    id: row.id,
    date: row.date,
    weight: row.weight === null ? null : Number(row.weight),
    // Pre-dates the weightUnit column - see schema.ts's dailyLogs comment.
    weightUnit: row.weight === null ? null : (row.weightUnit ?? 'kg'),
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

// Every point is converted to `unit` (the profile's current default) so
// the chart's axis stays consistent even when the underlying weigh-ins
// were logged in different units - see FITNESS-48.
export interface WeightTrendResponse {
  unit: WeightUnit;
  points: WeightTrendPoint[];
}
