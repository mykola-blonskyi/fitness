import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
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
export class PhotoAnalysisQueueModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ioredis reconnects forever on its own, so an unclosed client hangs Jest
  // to its own timeout instead of exiting. disconnect() drops it at once;
  // quit() would wait on a server that may never answer.
  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
