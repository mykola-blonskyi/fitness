import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EXERCISE_CATEGORIES } from '../exercise.types';

// No `locale` query param, unlike list-food-items.dto.ts - resolved
// server-side from the caller's stored users.locale instead.
export class ListExercisesDto {
  @IsOptional()
  @IsIn(EXERCISE_CATEGORIES)
  category?: (typeof EXERCISE_CATEGORIES)[number];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
