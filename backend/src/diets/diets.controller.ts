import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ListFoodItemsDto } from '../food-items/dto/list-food-items.dto';
import type { FoodItemPage } from '../food-items/food-items.service';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import type { DietResponse } from './diet.mapper';
import { DietsService } from './diets.service';
import { ReorderDietMealsDto } from './dto/reorder-diet-meals.dto';
import { SwapDietItemDto } from './dto/swap-diet-item.dto';

// Every route here operates on the caller's own Diets only, scoped by
// their own user id from the trusted identity headers.
@Controller('diets')
export class DietsController {
  constructor(private readonly dietsService: DietsService) {}

  // Always an explicit trigger, never a side effect of logging weight or
  // changing preferences. Inserts a new Diet row rather than editing the
  // previous one.
  @Post('generate')
  async generate(@CurrentUser() identity: Identity): Promise<DietResponse> {
    return this.dietsService.generate(identity.userId);
  }

  // The most recently generated Diet for this user, regardless of when.
  @Get('current')
  async getCurrent(@CurrentUser() identity: Identity): Promise<DietResponse> {
    return this.dietsService.findCurrent(identity.userId);
  }

  @Get('swap-candidates')
  async listSwapCandidates(
    @CurrentUser() identity: Identity,
    @Query() query: ListFoodItemsDto,
  ): Promise<FoodItemPage> {
    return this.dietsService.listSwapCandidates(identity.userId, query);
  }

  // Unlike generate(), this edits the existing Diet row in place rather
  // than inserting a new one - a swap is a correction, not a regeneration.
  @Post(':dietId/items/:itemId/swap')
  async swapItem(
    @CurrentUser() identity: Identity,
    @Param('dietId', ParseUUIDPipe) dietId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SwapDietItemDto,
  ): Promise<DietResponse> {
    return this.dietsService.swapItem(
      identity.userId,
      dietId,
      itemId,
      dto.foodItemId,
    );
  }

  @Put(':dietId/meals/reorder')
  async reorderMeals(
    @CurrentUser() identity: Identity,
    @Param('dietId', ParseUUIDPipe) dietId: string,
    @Body() dto: ReorderDietMealsDto,
  ): Promise<DietResponse> {
    return this.dietsService.reorderMeals(identity.userId, dietId, dto);
  }
}
