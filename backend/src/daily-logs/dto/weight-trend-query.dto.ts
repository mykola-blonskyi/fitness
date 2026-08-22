import { Type } from 'class-transformer';
import { IsIn } from 'class-validator';

// Matches the acceptance criteria's selectable window (7/30/90 days) - not
// an arbitrary day count, so an enum-style IsIn rather than a plain range
// check.
export const WEIGHT_TREND_WINDOWS = [7, 30, 90] as const;
export type WeightTrendWindow = (typeof WEIGHT_TREND_WINDOWS)[number];

export class WeightTrendQueryDto {
  // Query params arrive as strings - @Type coerces before IsIn checks it
  // against the numeric tuple above (global ValidationPipe has
  // transform: true, see main.ts).
  @Type(() => Number)
  @IsIn(WEIGHT_TREND_WINDOWS)
  days: WeightTrendWindow;
}
