import { Module } from '@nestjs/common';
import { CalorieTargetsModule } from '../calorie-targets/calorie-targets.module';
import { DailyLogsModule } from '../daily-logs/daily-logs.module';
import { DietPreferencesModule } from '../diet-preferences/diet-preferences.module';
import { FoodPreferencesModule } from '../food-preferences/food-preferences.module';
import { UsersModule } from '../users/users.module';
import { DietsController } from './diets.controller';
import { DietsService } from './diets.service';

@Module({
  imports: [
    UsersModule,
    DailyLogsModule,
    CalorieTargetsModule,
    FoodPreferencesModule,
    DietPreferencesModule,
  ],
  controllers: [DietsController],
  providers: [DietsService],
})
export class DietsModule {}
