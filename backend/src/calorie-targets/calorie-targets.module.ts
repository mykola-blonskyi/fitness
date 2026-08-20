import { Module } from '@nestjs/common';
import { DailyLogsModule } from '../daily-logs/daily-logs.module';
import { UsersModule } from '../users/users.module';
import { CalorieTargetsController } from './calorie-targets.controller';
import { CalorieTargetsService } from './calorie-targets.service';

@Module({
  imports: [UsersModule, DailyLogsModule],
  controllers: [CalorieTargetsController],
  providers: [CalorieTargetsService],
})
export class CalorieTargetsModule {}
