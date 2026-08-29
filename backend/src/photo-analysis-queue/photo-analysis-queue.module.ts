import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './photo-analysis-queue.constants';
import { PhotoAnalysisQueueService } from './photo-analysis-queue.service';

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
