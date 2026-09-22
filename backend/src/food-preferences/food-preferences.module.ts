import { Module } from '@nestjs/common';
import { DietPreferencesModule } from '../diet-preferences/diet-preferences.module';
import { FoodItemsModule } from '../food-items/food-items.module';
import { FoodPreferencesController } from './food-preferences.controller';
import { FoodPreferencesService } from './food-preferences.service';

@Module({
  imports: [DietPreferencesModule, FoodItemsModule],
  controllers: [FoodPreferencesController],
  providers: [FoodPreferencesService],
  exports: [FoodPreferencesService],
})
export class FoodPreferencesModule {}
