import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { ListFoodItemsDto } from './dto/list-food-items.dto';
import type { FoodItemResponse, TaxonomyResponse } from './food-item.mapper';
import { FoodItemsService, type FoodItemPage } from './food-items.service';

// The catalog itself is shared/global reference data, same as
// `exercises` - not scoped to the caller's own rows the way daily-logs
// or users/me are. list() takes @CurrentUser() only to resolve the
// caller's stored locale preference. IdentityGuard still applies
// globally: every route below requires a valid caller.
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

  @Post()
  async create(@Body() dto: CreateFoodItemDto): Promise<FoodItemResponse> {
    return this.foodItemsService.create(dto);
  }
}
