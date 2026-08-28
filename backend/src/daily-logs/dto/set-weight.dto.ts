import { IsIn, IsNumber, Min } from 'class-validator';
import { WEIGHT_UNITS, type WeightUnit } from '../../shared/weight-unit';

export class SetWeightDto {
  @IsNumber()
  @Min(0.1)
  weight: number;

  @IsIn(WEIGHT_UNITS)
  unit: WeightUnit;
}
