import type { ExerciseCategory } from '../exercises/exercise.types';
import type { ProgramExerciseTargets } from './program-exercise-targets';

// Joined program_exercises x exercises row - exercise display fields come
// straight from the base English exercises.name/imageUrl, no locale
// translation join, matching diets.service.ts's same call for Diet
// Items x Food Items (see diet.mapper.ts's DietItemWithFoodRow comment) -
// a nested owned resource referencing a shared catalog entry doesn't
// bother with per-locale display the way the catalog's own browse
// endpoint does. Extends ProgramExerciseTargets (program-exercise-
// targets.ts) rather than redeclaring targetSets/targetReps/
// targetDurationSeconds here - one definition of that shape.
export interface ProgramExerciseRow extends ProgramExerciseTargets {
  id: string;
  // Only needed by training-programs.service.ts's list() to group a
  // multi-program joined query back into each program's own exercises -
  // never read by toProgramExerciseResponse below.
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
