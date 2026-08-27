import { Module } from '@nestjs/common';
import { DailyLogsModule } from '../daily-logs/daily-logs.module';
import { StorageModule } from '../storage/storage.module';
import { PhotoSessionsController } from './photo-sessions.controller';
import { PhotoSessionsService } from './photo-sessions.service';

@Module({
  imports: [DailyLogsModule, StorageModule],
  controllers: [PhotoSessionsController],
  providers: [PhotoSessionsService],
  exports: [PhotoSessionsService],
})
export class PhotoSessionsModule {}
