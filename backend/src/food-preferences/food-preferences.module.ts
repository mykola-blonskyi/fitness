import { Module } from '@nestjs/common';
import { FoodPreferencesController } from './food-preferences.controller';
import { FoodPreferencesService } from './food-preferences.service';

@Module({
  controllers: [FoodPreferencesController],
  providers: [FoodPreferencesService],
})
export class FoodPreferencesModule {}
