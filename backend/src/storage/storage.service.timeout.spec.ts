import { Client } from 'minio';
import { StorageService } from './storage.service';

jest.mock('minio');

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

    const options = jest.mocked(Client).mock.calls[0][0] as {
      transportAgent: { options: { timeout: number } };
    };
    expect(options.transportAgent.options.timeout).toBe(30_000);
  });

  it('picks a plain HTTP agent when TLS is disabled', () => {
    process.env.MINIO_USE_SSL = 'false';

    new StorageService();

    const options = jest.mocked(Client).mock.calls[0][0] as {
      transportAgent: { options: { timeout: number } };
      useSSL: boolean;
    };
    expect(options.useSSL).toBe(false);
    expect(options.transportAgent.options.timeout).toBe(30_000);
  });
});
