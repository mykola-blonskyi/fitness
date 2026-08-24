import type { ExerciseCategory } from './exercise';

// Mirrors backend/src/training-programs/training-program.mapper.ts's
// ProgramExerciseResponse.
export interface ProgramExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: ExerciseCategory;
  exerciseImageUrl: string | null;
  orderIndex: number;
  targetSets: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
}

// Mirrors training-program.mapper.ts's TrainingProgramResponse.
export interface TrainingProgram {
  id: string;
  title: string;
  isArchived: boolean;
  isActive: boolean;
  exercises: ProgramExercise[];
}
