import { IsIn, IsOptional, IsString } from 'class-validator';
import { EXERCISE_CATEGORIES } from '../exercise.types';

// No `locale` query param, unlike list-food-items.dto.ts - the caller's
// display locale is resolved server-side from their own stored
// users.locale preference (see exercises.service.ts), not passed by the
// client. See schema.ts's users.locale comment for why.
export class ListExercisesDto {
  @IsOptional()
  @IsIn(EXERCISE_CATEGORIES)
  category?: (typeof EXERCISE_CATEGORIES)[number];

  @IsOptional()
  @IsString()
  search?: string;
}
