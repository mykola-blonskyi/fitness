import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTrainingProgramDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}
