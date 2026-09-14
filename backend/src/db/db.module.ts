import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB = 'DB';
const PG_POOL = 'PG_POOL';

const CONNECTION_TIMEOUT_MS = 10_000;
const STATEMENT_TIMEOUT_MS = 30_000;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () =>
        new Pool({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
          statement_timeout: STATEMENT_TIMEOUT_MS,
        }),
    },
    {
      provide: DB,
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
      inject: [PG_POOL],
    },
  ],
  exports: [DB],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // An open pool keeps its timers alive, which hangs Jest to its own
  // timeout instead of exiting.
  onModuleDestroy(): Promise<void> {
    return this.pool.end();
  }
}
