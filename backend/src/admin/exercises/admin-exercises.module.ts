import { Module } from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { AdminExercisesController } from './admin-exercises.controller';
import { AdminExercisesService } from './admin-exercises.service';

@Module({
  controllers: [AdminExercisesController],
  providers: [AdminExercisesService, AdminGuard],
})
export class AdminExercisesModule {}
