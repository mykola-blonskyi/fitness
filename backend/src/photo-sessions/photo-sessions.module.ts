import { Module } from '@nestjs/common';
import { DailyLogsModule } from '../daily-logs/daily-logs.module';
import { PhotoAnalysisQueueModule } from '../photo-analysis-queue/photo-analysis-queue.module';
import { StorageModule } from '../storage/storage.module';
import { PhotoSessionsController } from './photo-sessions.controller';
import { PhotoSessionsService } from './photo-sessions.service';

@Module({
  imports: [DailyLogsModule, StorageModule, PhotoAnalysisQueueModule],
  controllers: [PhotoSessionsController],
  providers: [PhotoSessionsService],
  exports: [PhotoSessionsService],
})
export class PhotoSessionsModule {}
