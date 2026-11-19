import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class StartWorkoutLogDto {
  @IsOptional()
  @IsUUID()
  trainingProgramId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;
}
