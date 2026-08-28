import { Module } from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { AdminFoodItemsController } from './admin-food-items.controller';
import { AdminFoodItemsService } from './admin-food-items.service';

@Module({
  controllers: [AdminFoodItemsController],
  providers: [AdminFoodItemsService, AdminGuard],
})
export class AdminFoodItemsModule {}
