import { Type } from 'class-transformer';
import { IsIn } from 'class-validator';

export const WEIGHT_TREND_WINDOWS = [7, 30, 90] as const;
export type WeightTrendWindow = (typeof WEIGHT_TREND_WINDOWS)[number];

export class WeightTrendQueryDto {
  // Query params arrive as strings - @Type coerces before IsIn checks it
  // against the numeric tuple above.
  @Type(() => Number)
  @IsIn(WEIGHT_TREND_WINDOWS)
  days: WeightTrendWindow;
}
