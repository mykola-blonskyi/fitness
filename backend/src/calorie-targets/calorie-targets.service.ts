import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { DailyLogsService } from '../daily-logs/daily-logs.service';
import { UsersService } from '../users/users.service';
import { toKg } from '../shared/weight-unit';
import { CALORIE_ALGORITHMS } from './algorithm-registry';
import type { MifflinV1Input } from './algorithms/mifflin-v1';
import {
  toCalorieTargetResponse,
  type CalorieTargetResponse,
} from './calorie-target.mapper';

const ALGORITHM_CODE = 'mifflin_v1';

@Injectable()
export class CalorieTargetsService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly usersService: UsersService,
    private readonly dailyLogsService: DailyLogsService,
  ) {}

  // Computes the caller's calorie/macro target from their profile and
  // most recent weigh-in (see knowledge/business-rules.md, docs/decisions.md
  // ADR-010). Throws NotFoundException when there's no weigh-in yet - the
  // profile-completion gate (FITNESS-4) already guarantees a profile
  // exists by the time any route reaches here, so a missing weigh-in is
  // the only realistic 404 a caller needs to handle gracefully (same
  // pattern as DailyLogsController's "no entry yet" 404).
  async computeForUser(userId: string): Promise<CalorieTargetResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Profile not created yet');
    }

    const weighIn = await this.dailyLogsService.findLatestWeighIn(userId);
    if (!weighIn || weighIn.weight === null || weighIn.weightUnit === null) {
      throw new NotFoundException('No weigh-in yet');
    }

    const algorithm = await this.db.query.dietCalculationAlgorithms.findFirst({
      where: eq(schema.dietCalculationAlgorithms.code, ALGORITHM_CODE),
    });
    if (!algorithm) {
      // Seeded by a migration (drizzle/0006_seed_mifflin_v1_algorithm.sql)
      // - only reachable if migrations haven't fully run, which the
      // boot-time migrate step (ADR-005) is meant to prevent.
      throw new NotFoundException('Calorie algorithm not configured');
    }

    const input: MifflinV1Input = {
      weightKg: toKg(weighIn.weight, weighIn.weightUnit),
      heightCm: user.height,
      age: user.age,
      gender: user.gender as MifflinV1Input['gender'],
      activityLevel: user.activityLevel as MifflinV1Input['activityLevel'],
      goal: user.goal as MifflinV1Input['goal'],
    };
    const result = CALORIE_ALGORITHMS[ALGORITHM_CODE](input);

    return toCalorieTargetResponse(
      algorithm,
      { weight: weighIn.weight, unit: weighIn.weightUnit, date: weighIn.date },
      result,
    );
  }
}
