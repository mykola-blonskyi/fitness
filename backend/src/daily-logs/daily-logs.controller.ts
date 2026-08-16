import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { SetWeightDto } from './dto/set-weight.dto';
import type { DailyLogResponse } from './daily-log.mapper';
import { DailyLogsService } from './daily-logs.service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertValidDate(date: string): void {
  if (!DATE_RE.test(date)) {
    throw new BadRequestException('date must be in YYYY-MM-DD format');
  }
}

// Every route here operates on the caller's own Daily Logs only, scoped
// by :date under their own user id from the trusted identity headers —
// no route accepts another user's id.
@Controller('daily-logs')
export class DailyLogsController {
  constructor(private readonly dailyLogsService: DailyLogsService) {}

  @Get(':date')
  async getByDate(
    @CurrentUser() identity: Identity,
    @Param('date') date: string,
  ): Promise<DailyLogResponse> {
    assertValidDate(date);
    const log = await this.dailyLogsService.findByDate(
      identity.hubUserId,
      date,
    );
    if (!log) {
      throw new NotFoundException('No Daily Log for this date');
    }
    return log;
  }

  @Put(':date/weight')
  async setWeight(
    @CurrentUser() identity: Identity,
    @Param('date') date: string,
    @Body() dto: SetWeightDto,
  ): Promise<DailyLogResponse> {
    assertValidDate(date);
    return this.dailyLogsService.setWeight(
      identity.hubUserId,
      date,
      dto.weight,
    );
  }

  @Delete(':date/weight')
  async clearWeight(
    @CurrentUser() identity: Identity,
    @Param('date') date: string,
  ): Promise<DailyLogResponse> {
    assertValidDate(date);
    return this.dailyLogsService.clearWeight(identity.hubUserId, date);
  }
}
