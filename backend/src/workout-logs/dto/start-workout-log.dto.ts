import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class StartWorkoutLogDto {
  @IsOptional()
  @IsUUID()
  trainingProgramId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;
}
