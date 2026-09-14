import { ConflictException } from '@nestjs/common';
import { DatabaseError } from 'pg';
import { UsersService } from './users.service';
import type { CreateUserDto } from './dto/create-user.dto';

function buildDb(findFirst: jest.Mock, insertResult: jest.Mock) {
  const returning = insertResult;
  const values = jest.fn().mockReturnValue({ returning });
  const insert = jest.fn().mockReturnValue({ values });
  return {
    db: { query: { users: { findFirst } }, insert },
    values,
  };
}

function uniqueViolation(): DatabaseError {
  const err = new DatabaseError('duplicate key', 0, 'error');
  err.code = '23505';
  return err;
}

describe('UsersService.create', () => {
  const dto: CreateUserDto = {
    name: 'Test',
    gender: 'male',
    dateOfBirth: '1990-01-01',
    height: 180,
    goal: 'maintenance',
    activityLevel: 'moderate',
  };

  it('rejects a second profile for the same identity found by the pre-check', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'existing-1' });
    const { db } = buildDb(findFirst, jest.fn());

    await expect(
      new UsersService(db as never).create('sub-1', 'user@example.com', dto),
    ).rejects.toThrow(ConflictException);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('turns a concurrent insert racing past the pre-check into a 409', async () => {
    const findFirst = jest.fn().mockResolvedValue(undefined);
    const returning = jest.fn().mockRejectedValue(uniqueViolation());
    const { db } = buildDb(findFirst, returning);

    await expect(
      new UsersService(db as never).create('sub-1', 'user@example.com', dto),
    ).rejects.toThrow(ConflictException);
  });

  it('rethrows an unrelated insert failure', async () => {
    const findFirst = jest.fn().mockResolvedValue(undefined);
    const returning = jest.fn().mockRejectedValue(new Error('db down'));
    const { db } = buildDb(findFirst, returning);

    await expect(
      new UsersService(db as never).create('sub-1', 'user@example.com', dto),
    ).rejects.toThrow('db down');
  });
});
