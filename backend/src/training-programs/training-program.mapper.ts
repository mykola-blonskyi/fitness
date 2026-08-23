import type { ExerciseCategory } from '../exercises/exercise.types';
import type { ProgramExerciseTargets } from './program-exercise-targets';

// Joined program_exercises x exercises row - display fields are the base
// English exercises.name/imageUrl, no locale translation, matching
// diet.mapper.ts's DietItemWithFoodRow.
export interface ProgramExerciseRow extends ProgramExerciseTargets {
  id: string;
  // Only used by list() to group a multi-program query; not read by
  // toProgramExerciseResponse.
  trainingProgramId?: string;
  exerciseId: string;
  orderIndex: number;
  exerciseName: string;
  exerciseCategory: string;
  exerciseImageUrl: string | null;
}

export interface ProgramExerciseResponse extends ProgramExerciseTargets {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: ExerciseCategory;
  exerciseImageUrl: string | null;
  orderIndex: number;
}

export interface TrainingProgramRow {
  id: string;
  title: string;
  isArchived: boolean;
}

export interface TrainingProgramResponse {
  id: string;
  title: string;
  isArchived: boolean;
  exercises: ProgramExerciseResponse[];
}

export function toProgramExerciseResponse(
  row: ProgramExerciseRow,
): ProgramExerciseResponse {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    exerciseName: row.exerciseName,
    exerciseCategory: row.exerciseCategory as ExerciseCategory,
    exerciseImageUrl: row.exerciseImageUrl,
    orderIndex: row.orderIndex,
    targetSets: row.targetSets,
    targetReps: row.targetReps,
    targetDurationSeconds: row.targetDurationSeconds,
  };
}

export function toTrainingProgramResponse(
  program: TrainingProgramRow,
  exerciseRows: ProgramExerciseRow[],
): TrainingProgramResponse {
  return {
    id: program.id,
    title: program.title,
    isArchived: program.isArchived,
    exercises: exerciseRows.map(toProgramExerciseResponse),
  };
}
