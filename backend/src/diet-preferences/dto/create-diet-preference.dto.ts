import { IsIn } from 'class-validator';
import { DIET_TYPES, type DietType } from '../diet-preference.types';

export class CreateDietPreferenceDto {
  @IsIn(DIET_TYPES)
  dietType: DietType;
}
