import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './photo-analysis-queue.module';
import type { DetectJob, DetectJobPhoto } from './photo-analysis-queue.types';

// Plain Redis list, not BullMQ - the Python worker has no maintained
// BullMQ client (ADR-003).
export const PHOTO_ANALYSIS_QUEUE_KEY = 'photo_analysis_jobs';

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
