import type { ExerciseCategory } from './exercise';
import type { WeightUnit } from './user';

// Mirrors backend/src/workout-logs/workout-log.mapper.ts's WorkoutSetResponse.
export interface WorkoutSet {
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

// Mirrors workout-log.mapper.ts's WorkoutLogResponse.
export interface WorkoutLog {
  id: string;
  date: string;
  trainingProgramId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  sets: WorkoutSet[];
}
