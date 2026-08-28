import type { ExerciseCategory } from '../exercises/exercise.types';
import type { WeightUnit } from '../shared/weight-unit';

export interface WorkoutSetRow {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  setNumber: number;
  weight: string | null;
  weightUnit: WeightUnit | null;
  reps: number | null;
  durationSeconds: number | null;
}

export interface WorkoutSetResponse {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: ExerciseCategory;
  setNumber: number;
  weight: number | null;
  weightUnit: WeightUnit | null;
  reps: number | null;
  durationSeconds: number | null;
}

export function toWorkoutSetResponse(row: WorkoutSetRow): WorkoutSetResponse {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    exerciseName: row.exerciseName,
    exerciseCategory: row.exerciseCategory as ExerciseCategory,
    setNumber: row.setNumber,
    weight: row.weight === null ? null : Number(row.weight),
    // Pre-dates the weightUnit column - see schema.ts's workoutSets comment.
    weightUnit: row.weight === null ? null : (row.weightUnit ?? 'kg'),
    reps: row.reps,
    durationSeconds: row.durationSeconds,
  };
}

export interface WorkoutLogRow {
  id: string;
  trainingProgramId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutLogResponse {
  id: string;
  date: string;
  trainingProgramId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  sets: WorkoutSetResponse[];
}

export function toWorkoutLogResponse(
  row: WorkoutLogRow,
  date: string,
  setRows: WorkoutSetRow[],
): WorkoutLogResponse {
  return {
    id: row.id,
    date,
    trainingProgramId: row.trainingProgramId,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sets: setRows.map(toWorkoutSetResponse),
  };
}
