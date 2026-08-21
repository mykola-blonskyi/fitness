import { IsIn, IsUUID } from 'class-validator';
import {
  FOOD_PREFERENCE_TARGET_TYPES,
  FOOD_PREFERENCE_TYPES,
  type FoodPreferenceTargetType,
  type FoodPreferenceType,
} from '../food-preference.types';

// targetId's existence in the table targetType actually points at
// (category/subcategory/role/food_item) can't be checked by a
// class-validator decorator - it's cross-field and depends on a DB
// lookup, so it's validated in food-preferences.service.ts instead.
export class CreateFoodPreferenceDto {
  @IsIn(FOOD_PREFERENCE_TYPES)
  type: FoodPreferenceType;

  @IsIn(FOOD_PREFERENCE_TARGET_TYPES)
  targetType: FoodPreferenceTargetType;

  @IsUUID()
  targetId: string;
}
