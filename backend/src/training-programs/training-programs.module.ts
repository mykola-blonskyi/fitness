import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { TrainingProgramsController } from './training-programs.controller';
import { TrainingProgramsService } from './training-programs.service';

@Module({
  imports: [ExercisesModule],
  controllers: [TrainingProgramsController],
  providers: [TrainingProgramsService],
  exports: [TrainingProgramsService],
})
export class TrainingProgramsModule {}
