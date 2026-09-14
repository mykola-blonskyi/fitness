import { S3Error } from 'minio';
import { StorageService } from './storage.service';

function buildService(statObject: jest.Mock): StorageService {
  process.env.MINIO_ENDPOINT = 'localhost';
  process.env.MINIO_ACCESS_KEY = 'test';
  process.env.MINIO_SECRET_KEY = 'test';
  const service = new StorageService();
  (service as unknown as { client: { statObject: jest.Mock } }).client = {
    statObject,
  };
  return service;
}

function s3Error(code: string): S3Error {
  const err = new S3Error(code);
  err.code = code;
  return err;
}

describe('StorageService.objectExists', () => {
  it('reports an object present when MinIO stats it', async () => {
    const service = buildService(jest.fn().mockResolvedValue({ size: 1 }));

    await expect(service.objectExists('progress-photos/u/1')).resolves.toBe(
      true,
    );
  });

  it.each(['NotFound', 'NoSuchKey'])(
    'reports an object absent on %s',
    async (code) => {
      const service = buildService(jest.fn().mockRejectedValue(s3Error(code)));

      await expect(service.objectExists('progress-photos/u/1')).resolves.toBe(
        false,
      );
    },
  );

  it('rethrows a transport failure instead of reporting the object absent', async () => {
    const unreachable = Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED',
    });
    const service = buildService(jest.fn().mockRejectedValue(unreachable));

    await expect(service.objectExists('progress-photos/u/1')).rejects.toBe(
      unreachable,
    );
  });

  it('rethrows an S3 error that is not a missing object', async () => {
    const denied = s3Error('AccessDenied');
    const service = buildService(jest.fn().mockRejectedValue(denied));

    await expect(service.objectExists('progress-photos/u/1')).rejects.toBe(
      denied,
    );
  });
});
