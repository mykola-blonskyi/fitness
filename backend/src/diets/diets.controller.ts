import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import type { DietResponse } from './diet.mapper';
import { DietsService } from './diets.service';
import { SwapDietItemDto } from './dto/swap-diet-item.dto';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertValidDate(date: string): void {
  if (!DATE_RE.test(date)) {
    throw new BadRequestException('date must be in YYYY-MM-DD format');
  }
}

// Every route here operates on the caller's own Diets only, scoped by
// :date under their own user id from the trusted identity headers - same
// convention as daily-logs.controller.ts.
@Controller('diets')
export class DietsController {
  constructor(private readonly dietsService: DietsService) {}

  // Always an explicit trigger (see knowledge/business-rules.md "Diet
  // regeneration is always manual") - never called as a side effect of
  // logging weight or changing preferences. Regenerating inserts a new
  // Diet row rather than editing the previous one.
  @Post(':date/generate')
  async generate(
    @CurrentUser() identity: Identity,
    @Param('date') date: string,
  ): Promise<DietResponse> {
    assertValidDate(date);
    return this.dietsService.generate(identity.hubUserId, date);
  }

  // "Today's menu" - the most recently created Diet for this date's Daily
  // Log (knowledge/business-rules.md "Current diet resolution").
  @Get(':date/current')
  async getCurrent(
    @CurrentUser() identity: Identity,
    @Param('date') date: string,
  ): Promise<DietResponse> {
    assertValidDate(date);
    return this.dietsService.findCurrent(identity.hubUserId, date);
  }

  // Swaps one Diet Item for another Food Item sharing the same Food Role
  // (FITNESS-31) - rejected if the replacement violates an active Food or
  // Diet Preference. Updates the Diet's stored totals in place; unlike
  // generate(), this edits the existing Diet row rather than inserting a
  // new one, since a swap is a correction to the current menu, not a
  // regeneration (knowledge/business-rules.md "Diet regeneration is
  // always manual" governs full regeneration, not per-item edits).
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
