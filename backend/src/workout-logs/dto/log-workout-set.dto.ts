import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import type { WorkoutSetValuesInput } from '../workout-set-values';

// Which fields are required depends on the referenced Exercise's category,
// a DB lookup - can't be expressed with class-validator decorators here,
// so it's enforced in the service via resolveWorkoutSetValues instead.
export class LogWorkoutSetDto implements WorkoutSetValuesInput {
  @IsUUID()
  exerciseId: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  weight?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;
}
