import { ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseError } from 'pg';
import { PhotoSessionsService } from './photo-sessions.service';
import type { ConfirmPhotoSessionDto } from './dto/confirm-photo-session.dto';

function uniqueViolation(): DatabaseError {
  const err = new DatabaseError('duplicate key', 0, 'error');
  err.code = '23505';
  return err;
}

function buildDb(overrides: { findFirst: jest.Mock; photos: unknown[] }) {
  const txDelete = jest
    .fn()
    .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
  const tx = { delete: txDelete };

  return {
    query: { photoSessions: { findFirst: overrides.findFirst } },
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(overrides.photos),
      }),
    }),
    transaction: jest.fn(async (cb: (t: typeof tx) => Promise<void>) => {
      await cb(tx);
    }),
    txDelete,
  };
}

describe('PhotoSessionsService.remove', () => {
  const session = {
    id: 'session-1',
    userId: 'user-1',
    date: '2026-08-01',
    isBaseline: false,
    status: 'confirmed' as const,
    createdAt: new Date('2026-08-01'),
    updatedAt: new Date('2026-08-01'),
  };
  const photos = [
    {
      id: 'photo-1',
      pose: 'front' as const,
      analysisStatus: 'completed' as const,
      alignmentData: null,
      createdAt: new Date('2026-08-01'),
      objectKey: 'progress-photos/user-1/photo-1',
    },
    {
      id: 'photo-2',
      pose: 'side' as const,
      analysisStatus: 'completed' as const,
      alignmentData: null,
      createdAt: new Date('2026-08-01'),
      objectKey: 'progress-photos/user-1/photo-2',
    },
  ];

  it('deletes the DB rows before removing storage objects', async () => {
    const findFirst = jest.fn().mockResolvedValue(session);
    const db = buildDb({ findFirst, photos });
    const removeObject = jest.fn().mockResolvedValue(undefined);
    const service = new PhotoSessionsService(
      db as never,
      {} as never,
      { removeObject } as never,
      {} as never,
    );

    const result = await service.remove('user-1', 'session-1');

    expect(db.txDelete).toHaveBeenCalledTimes(2);
    expect(removeObject).toHaveBeenCalledWith('progress-photos/user-1/photo-1');
    expect(removeObject).toHaveBeenCalledWith('progress-photos/user-1/photo-2');
    expect(db.transaction.mock.invocationCallOrder[0]).toBeLessThan(
      removeObject.mock.invocationCallOrder[0],
    );
    expect(result).toMatchObject({
      id: 'session-1',
      photos: [{ id: 'photo-1' }, { id: 'photo-2' }],
    });
  });

  it('still deletes the DB rows and returns a response when one storage removal fails', async () => {
    const findFirst = jest.fn().mockResolvedValue(session);
    const db = buildDb({ findFirst, photos });
    const removeObject = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('minio down'));
    const service = new PhotoSessionsService(
      db as never,
      {} as never,
      { removeObject } as never,
      {} as never,
    );

    const result = await service.remove('user-1', 'session-1');

    expect(db.txDelete).toHaveBeenCalledTimes(2);
    expect(removeObject).toHaveBeenCalledTimes(2);
    expect(result.id).toBe('session-1');
  });

  it('throws NotFoundException for a session owned by someone else', async () => {
    const findFirst = jest.fn().mockResolvedValue(undefined);
    const db = buildDb({ findFirst, photos: [] });
    const removeObject = jest.fn();
    const service = new PhotoSessionsService(
      db as never,
      {} as never,
      { removeObject } as never,
      {} as never,
    );

    await expect(service.remove('user-1', 'session-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(removeObject).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

describe('PhotoSessionsService.confirm', () => {
  const dto: ConfirmPhotoSessionDto = {
    photos: [{ objectKey: 'progress-photos/user-1/photo-1' }],
  };
  const storageService = {
    ownsObjectKey: jest.fn().mockReturnValue(true),
    objectExists: jest.fn().mockResolvedValue(true),
  };
  const dailyLogsService = {
    findOrCreate: jest.fn().mockResolvedValue({ id: 'daily-1' }),
  };
  const photoAnalysisQueueService = {
    pushDetectJob: jest.fn().mockResolvedValue(undefined),
  };

  it('turns a replayed confirm into a 409 instead of an unhandled unique violation', async () => {
    const db = { transaction: jest.fn().mockRejectedValue(uniqueViolation()) };
    const service = new PhotoSessionsService(
      db as never,
      dailyLogsService as never,
      storageService as never,
      photoAnalysisQueueService as never,
    );

    await expect(service.confirm('user-1', '2026-09-14', dto)).rejects.toThrow(
      ConflictException,
    );
    expect(photoAnalysisQueueService.pushDetectJob).not.toHaveBeenCalled();
  });
});
