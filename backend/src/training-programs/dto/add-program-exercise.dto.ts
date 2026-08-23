import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import type { ProgramExerciseTargetsInput } from '../program-exercise-targets';

// Which target fields are required depends on the referenced Exercise's
// category, a DB lookup - can't be expressed with class-validator
// decorators here, so it's enforced in the service via
// resolveProgramExerciseTargets instead.
export class AddProgramExerciseDto implements ProgramExerciseTargetsInput {
  @IsUUID()
  exerciseId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetSets?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetReps?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetDurationSeconds?: number;
}
