import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { DietsService } from '../diets/diets.service';
import { DEMO_USER_ID } from '../identity/demo-identity';
import { resetDemoData } from '../scripts/demo-seed';

const RESET_HOUR_UTC = 3;

export function msUntilNextReset(now: Date): number {
  const next = new Date(now);
  next.setUTCHours(RESET_HOUR_UTC, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

// Also resets on boot, so a fresh deploy has the demo account before anyone
// clicks it.
@Injectable()
export class DemoResetService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(DemoResetService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly dietsService: DietsService,
  ) {}

  onApplicationBootstrap() {
    // The e2e suite boots AppModule without a database.
    if (process.env.NODE_ENV === 'test') return;
    void this.reset();
  }

  onModuleDestroy() {
    clearTimeout(this.timer);
  }

  async reset() {
    try {
      await resetDemoData(this.db);
      await this.dietsService.generate(DEMO_USER_ID);
      this.logger.log('Demo account reset');
    } catch (err) {
      this.logger.error('Demo account reset failed', err);
      Sentry.captureException(err);
    } finally {
      this.timer = setTimeout(
        () => void this.reset(),
        msUntilNextReset(new Date()),
      ).unref();
    }
  }
}
