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
import { LogWorkoutSetDto } from './dto/log-workout-set.dto';
import { StartWorkoutLogDto } from './dto/start-workout-log.dto';
import type {
  WorkoutLogResponse,
  WorkoutSetResponse,
} from './workout-log.mapper';
import { WorkoutLogsService } from './workout-logs.service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertValidDate(date: string): void {
  if (!DATE_RE.test(date)) {
    throw new BadRequestException('date must be in YYYY-MM-DD format');
  }
}

// Every route here operates on the caller's own Workout Logs only -
// ownership is re-checked in the service, never assumed from the URL.
@Controller('workout-logs')
export class WorkoutLogsController {
  constructor(private readonly workoutLogsService: WorkoutLogsService) {}

  // Past Workout Logs, most recent date first.
  @Get()
  async list(@CurrentUser() identity: Identity): Promise<WorkoutLogResponse[]> {
    return this.workoutLogsService.list(identity.hubUserId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<WorkoutLogResponse> {
    return this.workoutLogsService.findOne(identity.hubUserId, id);
  }

  @Post(':date')
  async start(
    @CurrentUser() identity: Identity,
    @Param('date') date: string,
    @Body() dto: StartWorkoutLogDto,
  ): Promise<WorkoutLogResponse> {
    assertValidDate(date);
    return this.workoutLogsService.start(identity.hubUserId, date, dto);
  }

  @Post(':id/sets')
  async logSet(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
    @Body() dto: LogWorkoutSetDto,
  ): Promise<WorkoutSetResponse> {
    return this.workoutLogsService.logSet(identity.hubUserId, id, dto);
  }
}
