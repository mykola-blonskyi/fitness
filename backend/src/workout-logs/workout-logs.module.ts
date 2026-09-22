import { Module } from '@nestjs/common';
import { DailyLogsModule } from '../daily-logs/daily-logs.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { TrainingProgramsModule } from '../training-programs/training-programs.module';
import { WorkoutLogsController } from './workout-logs.controller';
import { WorkoutLogsService } from './workout-logs.service';

@Module({
  imports: [DailyLogsModule, TrainingProgramsModule, ExercisesModule],
  controllers: [WorkoutLogsController],
  providers: [WorkoutLogsService],
})
export class WorkoutLogsModule {}
