import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

// The full, reordered list of this program's own Program Exercise ids -
// training-programs.service.ts's reorderExercises() rejects anything that
// isn't exactly this program's existing id set (no partial reorders, no
// ids from another program), then reassigns orderIndex 0..n-1 by array
// position.
export class ReorderProgramExercisesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  orderedIds: string[];
}
