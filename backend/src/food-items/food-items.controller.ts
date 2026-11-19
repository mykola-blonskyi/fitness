import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import { NotForDemo } from '../identity/demo-identity';
import type { Identity } from '../identity/identity.types';
import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { ListFoodItemsDto } from './dto/list-food-items.dto';
import type { FoodItemResponse, TaxonomyResponse } from './food-item.mapper';
import { FoodItemsService, type FoodItemPage } from './food-items.service';

@Controller('food-items')
export class FoodItemsController {
  constructor(private readonly foodItemsService: FoodItemsService) {}

  @Get()
  async list(
    @CurrentUser() identity: Identity,
    @Query() query: ListFoodItemsDto,
  ): Promise<FoodItemPage> {
    return this.foodItemsService.list(identity.userId, query);
  }

  @Get('taxonomy')
  async getTaxonomy(): Promise<TaxonomyResponse> {
    return this.foodItemsService.getTaxonomy();
  }

  @NotForDemo()
  @Post()
  async create(
    @CurrentUser() identity: Identity,
    @Body() dto: CreateFoodItemDto,
  ): Promise<FoodItemResponse> {
    return this.foodItemsService.create(identity.userId, dto);
  }
}
