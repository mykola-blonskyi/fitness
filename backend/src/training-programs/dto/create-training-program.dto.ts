import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTrainingProgramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;
}
