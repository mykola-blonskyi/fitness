import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { PhotoAnalysisQueueService } from './photo-analysis-queue.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => new Redis(process.env.REDIS_URL!),
    },
    PhotoAnalysisQueueService,
  ],
  exports: [PhotoAnalysisQueueService],
})
export class PhotoAnalysisQueueModule {}
