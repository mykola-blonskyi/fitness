import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { assertValidDate } from '../shared/date';
import { SetWeightDto } from './dto/set-weight.dto';
import { WeightTrendQueryDto } from './dto/weight-trend-query.dto';
import type { DailyLogResponse, WeightTrendResponse } from './daily-log.mapper';
import { DailyLogsService } from './daily-logs.service';

// Every route here operates on the caller's own Daily Logs only, scoped
// by :date under their own user id from the trusted identity headers —
// no route accepts another user's id.
@Controller('daily-logs')
export class DailyLogsController {
  constructor(private readonly dailyLogsService: DailyLogsService) {}

  // Registered ahead of the `:date` route below - both are static
  // segments that `:date` would otherwise swallow as a literal date
  // value (Express/Nest match routes in registration order).
  @Get('weight-trend')
  async getWeightTrend(
    @CurrentUser() identity: Identity,
    @Query() query: WeightTrendQueryDto,
  ): Promise<WeightTrendResponse> {
    return this.dailyLogsService.getWeightTrend(identity.hubUserId, query.days);
  }

  @Get('latest-weigh-in')
  async getLatestWeighIn(
    @CurrentUser() identity: Identity,
  ): Promise<DailyLogResponse> {
    const log = await this.dailyLogsService.findLatestWeighIn(
      identity.hubUserId,
    );
    if (!log) {
      throw new NotFoundException('No weigh-in yet');
    }
    return log;
  }

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
      dto.unit,
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
