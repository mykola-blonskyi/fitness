import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import {
  PHOTO_ANALYSIS_QUEUE_KEY,
  REDIS_CLIENT,
} from './photo-analysis-queue.constants';
import type { DetectJob, DetectJobPhoto } from './photo-analysis-queue.types';

@Injectable()
export class PhotoAnalysisQueueService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async pushDetectJob(
    sessionId: string,
    photos: DetectJobPhoto[],
  ): Promise<void> {
    const job: DetectJob = { type: 'detect', sessionId, photos };
    await this.redis.lpush(PHOTO_ANALYSIS_QUEUE_KEY, JSON.stringify(job));
  }
}
