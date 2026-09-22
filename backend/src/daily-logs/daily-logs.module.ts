import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { DailyLogsController } from './daily-logs.controller';
import { DailyLogsService } from './daily-logs.service';

@Module({
  imports: [UsersModule],
  controllers: [DailyLogsController],
  providers: [DailyLogsService],
  exports: [DailyLogsService],
})
export class DailyLogsModule {}
