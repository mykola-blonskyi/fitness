import { Module } from '@nestjs/common';
import { CalorieTargetsModule } from '../calorie-targets/calorie-targets.module';
import { DietPreferencesModule } from '../diet-preferences/diet-preferences.module';
import { FoodItemsModule } from '../food-items/food-items.module';
import { FoodPreferencesModule } from '../food-preferences/food-preferences.module';
import { UsersModule } from '../users/users.module';
import { DietsController } from './diets.controller';
import { DietsService } from './diets.service';

@Module({
  imports: [
    UsersModule,
    CalorieTargetsModule,
    FoodItemsModule,
    FoodPreferencesModule,
    DietPreferencesModule,
  ],
  controllers: [DietsController],
  providers: [DietsService],
})
export class DietsModule {}
