import type { ExerciseCategory } from './exercise';

// Mirrors backend/src/training-programs/training-program.mapper.ts's
// ProgramExerciseResponse - exerciseName/exerciseCategory/exerciseImageUrl
// come straight from the base English exercises row, no locale
// translation (see that mapper's comment).
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

// Mirrors backend/src/training-programs/training-program.mapper.ts's
// TrainingProgramResponse.
export interface TrainingProgram {
  id: string;
  title: string;
  isArchived: boolean;
  exercises: ProgramExercise[];
}
