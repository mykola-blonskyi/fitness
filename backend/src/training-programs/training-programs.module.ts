import { Module } from '@nestjs/common';
import { TrainingProgramsController } from './training-programs.controller';
import { TrainingProgramsService } from './training-programs.service';

@Module({
  controllers: [TrainingProgramsController],
  providers: [TrainingProgramsService],
  exports: [TrainingProgramsService],
})
export class TrainingProgramsModule {}
