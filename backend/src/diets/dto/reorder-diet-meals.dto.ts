import { ArrayNotEmpty, IsArray, IsInt, Min } from 'class-validator';

// The full, reordered list of this diet's own meal_position values - no
// partial reorders, no positions from another diet. mealPosition doubles
// as the meal's stable identifier here since it's already unique per diet.
export class ReorderDietMealsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  orderedMealPositions: number[];
}
