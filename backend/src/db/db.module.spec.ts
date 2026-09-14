import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { DbModule } from './db.module';

jest.mock('pg');

describe('DbModule', () => {
  it('builds a pool with a connection-acquire timeout and a statement timeout', async () => {
    process.env.DATABASE_URL = 'postgres://db:5432/fitness';
    jest.mocked(Pool).mockClear();

    await Test.createTestingModule({ imports: [DbModule] }).compile();

    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://db:5432/fitness',
      connectionTimeoutMillis: 10_000,
      statement_timeout: 30_000,
    });
  });
});
