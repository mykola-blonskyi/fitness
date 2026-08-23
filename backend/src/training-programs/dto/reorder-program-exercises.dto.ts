import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

// The full, reordered list of this program's own Program Exercise ids -
// no partial reorders, no ids from another program.
export class ReorderProgramExercisesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  orderedIds: string[];
}
