import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { ListFoodItemsDto } from './dto/list-food-items.dto';
import type { FoodItemResponse, TaxonomyResponse } from './food-item.mapper';
import { FoodItemsService, type FoodItemPage } from './food-items.service';

// The catalog itself is shared/global reference data, same as
// `exercises` - not scoped to the caller's own rows the way daily-logs
// or users/me are, so no @CurrentUser() is needed here. IdentityGuard
// still applies globally: every route below requires a valid caller.
@Controller('food-items')
export class FoodItemsController {
  constructor(private readonly foodItemsService: FoodItemsService) {}

  @Get()
  async list(@Query() query: ListFoodItemsDto): Promise<FoodItemPage> {
    return this.foodItemsService.list(query);
  }

  @Get('taxonomy')
  async getTaxonomy(): Promise<TaxonomyResponse> {
    return this.foodItemsService.getTaxonomy();
  }

  @Post()
  async create(@Body() dto: CreateFoodItemDto): Promise<FoodItemResponse> {
    return this.foodItemsService.create(dto);
  }
}
