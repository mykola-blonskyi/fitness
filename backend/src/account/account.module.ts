import { Module } from '@nestjs/common';
import { DailyLogsModule } from '../daily-logs/daily-logs.module';
import { DietPreferencesModule } from '../diet-preferences/diet-preferences.module';
import { DietsModule } from '../diets/diets.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { FoodItemsModule } from '../food-items/food-items.module';
import { FoodPreferencesModule } from '../food-preferences/food-preferences.module';
import { PhotoSessionsModule } from '../photo-sessions/photo-sessions.module';
import { StorageModule } from '../storage/storage.module';
import { TrainingProgramsModule } from '../training-programs/training-programs.module';
import { UsersModule } from '../users/users.module';
import { WorkoutLogsModule } from '../workout-logs/workout-logs.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [
    UsersModule,
    DailyLogsModule,
    WorkoutLogsModule,
    TrainingProgramsModule,
    FoodPreferencesModule,
    DietPreferencesModule,
    DietsModule,
    PhotoSessionsModule,
    ExercisesModule,
    FoodItemsModule,
    StorageModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
