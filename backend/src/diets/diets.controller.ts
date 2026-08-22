import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import type { DietResponse } from './diet.mapper';
import { DietsService } from './diets.service';

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
}
