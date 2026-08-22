import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { EXERCISE_CATEGORIES } from '../exercise.types';

// Manually created exercises leave source/sourceId null and isVerified at
// its schema default (false), same convention as
// food-items/dto/create-food-item.dto.ts - a manually typed exercise is
// no more trustworthy than an imported one until a reviewer confirms it.
// No imageUrl - only the seed import sets that.
export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(EXERCISE_CATEGORIES)
  category: (typeof EXERCISE_CATEGORIES)[number];
}
