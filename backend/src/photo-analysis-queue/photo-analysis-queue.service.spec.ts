import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { PhotoAnalysisQueueModule } from './photo-analysis-queue.module';
import { REDIS_CLIENT } from './photo-analysis-queue.constants';
import { PhotoAnalysisQueueService } from './photo-analysis-queue.service';

jest.mock('ioredis');

// Regression: the REDIS_CLIENT token used to live in the module file, which
// imported the service, which imported the token back - a circular import
// that left the token undefined at runtime and broke DI in production.
describe('PhotoAnalysisQueueModule', () => {
  it('resolves PhotoAnalysisQueueService with the Redis client injected', async () => {
    const redis = { lpush: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      imports: [PhotoAnalysisQueueModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(redis)
      .compile();

    const service = moduleRef.get(PhotoAnalysisQueueService);
    await service.pushDetectJob('session-1', [
      { photoId: 'p1', objectKey: 'progress-photos/p1.jpg' },
    ]);

    expect(redis.lpush).toHaveBeenCalledWith(
      'photo_analysis_jobs',
      JSON.stringify({
        type: 'detect',
        sessionId: 'session-1',
        photos: [{ photoId: 'p1', objectKey: 'progress-photos/p1.jpg' }],
      }),
    );
  });

  it('builds a client that rejects commands while Redis is down', async () => {
    process.env.REDIS_URL = 'redis://queue:6379';
    jest.mocked(Redis).mockClear();

    await Test.createTestingModule({
      imports: [PhotoAnalysisQueueModule],
    }).compile();

    expect(Redis).toHaveBeenCalledWith('redis://queue:6379', {
      enableOfflineQueue: false,
      connectTimeout: 5_000,
      commandTimeout: 5_000,
    });
  });
});
