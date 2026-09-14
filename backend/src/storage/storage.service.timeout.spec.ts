import { Client, type ClientOptions } from 'minio';
import { StorageService } from './storage.service';

jest.mock('minio');

// Agent carries `options` at runtime, but @types/node does not declare it.
function agentTimeout(options: ClientOptions): number | undefined {
  const agent = options.transportAgent as unknown as
    { options?: { timeout?: number } } | undefined;
  return agent?.options?.timeout;
}

describe('StorageService client construction', () => {
  beforeEach(() => {
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_ACCESS_KEY = 'test';
    process.env.MINIO_SECRET_KEY = 'test';
    jest.mocked(Client).mockClear();
  });

  it('bounds every request with a transport agent timeout', () => {
    process.env.MINIO_USE_SSL = 'true';

    new StorageService();

    const options = jest.mocked(Client).mock.calls[0][0];
    expect(agentTimeout(options)).toBe(30_000);
  });

  it('picks a plain HTTP agent when TLS is disabled', () => {
    process.env.MINIO_USE_SSL = 'false';

    new StorageService();

    const options = jest.mocked(Client).mock.calls[0][0];
    expect(options.useSSL).toBe(false);
    expect(agentTimeout(options)).toBe(30_000);
  });
});
