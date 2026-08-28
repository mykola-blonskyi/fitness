import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { ListAdminFoodItemsDto } from './dto/list-admin-food-items.dto';
import {
  AdminFoodItemsService,
  type AdminFoodItemPage,
} from './admin-food-items.service';
import type { AdminFoodItemResponse } from './admin-food-item.mapper';

@Controller('admin/food-items')
@UseGuards(AdminGuard)
export class AdminFoodItemsController {
  constructor(private readonly adminFoodItemsService: AdminFoodItemsService) {}

  @Get()
  async list(
    @Query() query: ListAdminFoodItemsDto,
  ): Promise<AdminFoodItemPage> {
    return this.adminFoodItemsService.list(query);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string): Promise<AdminFoodItemResponse> {
    return this.adminFoodItemsService.setVerified(id, true);
  }

  @Post(':id/unapprove')
  async unapprove(@Param('id') id: string): Promise<AdminFoodItemResponse> {
    return this.adminFoodItemsService.setVerified(id, false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.adminFoodItemsService.remove(id);
  }
}
