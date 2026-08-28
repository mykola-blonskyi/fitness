import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { EXERCISE_CATEGORIES } from '../exercise.types';

// source/sourceId/imageUrl are left at their schema defaults — only the
// seed import sets those.
export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(EXERCISE_CATEGORIES)
  category: (typeof EXERCISE_CATEGORIES)[number];
}
