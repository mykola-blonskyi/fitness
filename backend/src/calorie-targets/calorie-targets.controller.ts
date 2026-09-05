import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import type { CalorieTargetResponse } from './calorie-target.mapper';
import { CalorieTargetsService } from './calorie-targets.service';

// Operates on the caller's own profile/weigh-ins only, same convention as
// UsersController/DailyLogsController - no route accepts another user's id.
@Controller('calorie-targets')
export class CalorieTargetsController {
  constructor(private readonly calorieTargetsService: CalorieTargetsService) {}

  @Get()
  async getMine(
    @CurrentUser() identity: Identity,
  ): Promise<CalorieTargetResponse> {
    return this.calorieTargetsService.computeForUser(identity.userId);
  }
}
