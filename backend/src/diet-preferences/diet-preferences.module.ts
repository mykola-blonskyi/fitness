import { Module } from '@nestjs/common';
import { DietPreferencesController } from './diet-preferences.controller';
import { DietPreferencesService } from './diet-preferences.service';

@Module({
  controllers: [DietPreferencesController],
  providers: [DietPreferencesService],
  exports: [DietPreferencesService],
})
export class DietPreferencesModule {}
