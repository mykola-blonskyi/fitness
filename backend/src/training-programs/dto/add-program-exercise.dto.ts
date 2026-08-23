import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import type { ProgramExerciseTargetsInput } from '../program-exercise-targets';

// Whether targetSets/targetReps or targetDurationSeconds is actually
// required/allowed depends on the referenced Exercise's category
// (cardio vs. everything else) - that's cross-field and depends on a DB
// lookup, so it can't be expressed with class-validator decorators here.
// Validated in training-programs.service.ts via
// program-exercise-targets.ts's resolveProgramExerciseTargets, same
// convention as create-food-preference.dto.ts's targetId comment.
// `implements ProgramExerciseTargetsInput` ties the three target fields
// below to that same shape at compile time, one definition instead of
// two drifting copies.
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
