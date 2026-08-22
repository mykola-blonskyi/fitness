import { Module } from '@nestjs/common';
import { FoodPreferencesController } from './food-preferences.controller';
import { FoodPreferencesService } from './food-preferences.service';

@Module({
  controllers: [FoodPreferencesController],
  providers: [FoodPreferencesService],
  exports: [FoodPreferencesService],
})
export class FoodPreferencesModule {}
