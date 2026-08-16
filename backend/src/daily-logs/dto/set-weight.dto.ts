import { IsNumber, Min } from 'class-validator';

export class SetWeightDto {
  @IsNumber()
  @Min(0.1)
  weight: number;
}
