import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { assertValidDate } from '../shared/date';
import type { DietResponse } from './diet.mapper';
import { DietsService } from './diets.service';
import { SwapDietItemDto } from './dto/swap-diet-item.dto';

// Every route here operates on the caller's own Diets only, scoped by
// :date under their own user id from the trusted identity headers.
@Controller('diets')
export class DietsController {
  constructor(private readonly dietsService: DietsService) {}

  // Always an explicit trigger, never a side effect of logging weight or
  // changing preferences. Inserts a new Diet row rather than editing the
  // previous one.
  @Post(':date/generate')
  async generate(
    @CurrentUser() identity: Identity,
    @Param('date') date: string,
  ): Promise<DietResponse> {
    assertValidDate(date);
    return this.dietsService.generate(identity.hubUserId, date);
  }

  // "Today's menu" - the most recently created Diet for this date's Daily Log.
  @Get(':date/current')
  async getCurrent(
    @CurrentUser() identity: Identity,
    @Param('date') date: string,
  ): Promise<DietResponse> {
    assertValidDate(date);
    return this.dietsService.findCurrent(identity.hubUserId, date);
  }

  // Unlike generate(), this edits the existing Diet row in place rather
  // than inserting a new one - a swap is a correction, not a regeneration.
  @Post(':dietId/items/:itemId/swap')
  async swapItem(
    @CurrentUser() identity: Identity,
    @Param('dietId') dietId: string,
    @Param('itemId') itemId: string,
    @Body() dto: SwapDietItemDto,
  ): Promise<DietResponse> {
    return this.dietsService.swapItem(
      identity.hubUserId,
      dietId,
      itemId,
      dto.foodItemId,
    );
  }
}
