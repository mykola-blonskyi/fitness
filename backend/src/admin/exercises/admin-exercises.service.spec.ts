import { ConflictException, NotFoundException } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { AdminExercisesService } from './admin-exercises.service';

function buildDb(overrides: {
  findFirst: jest.Mock;
  programExerciseCount: number;
  workoutSetCount: number;
}) {
  const txDelete = jest
    .fn()
    .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
  const tx = { delete: txDelete };

  const select = jest
    .fn()
    .mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest
          .fn()
          .mockResolvedValue([{ value: overrides.programExerciseCount }]),
      }),
    })
    .mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest
          .fn()
          .mockResolvedValue([{ value: overrides.workoutSetCount }]),
      }),
    });

  return {
    query: { exercises: { findFirst: overrides.findFirst } },
    select,
    transaction: jest.fn(async (cb: (t: typeof tx) => Promise<void>) => {
      await cb(tx);
    }),
    txDelete,
  };
}

describe('AdminExercisesService.remove', () => {
  it('blocks deletion when a workout set references the exercise but no program does', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'exercise-1' });
    const db = buildDb({
      findFirst,
      programExerciseCount: 0,
      workoutSetCount: 4,
    });
    const service = new AdminExercisesService(db as never);

    await expect(service.remove('exercise-1')).rejects.toThrow(
      ConflictException,
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('deletes when nothing references the exercise', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'exercise-1' });
    const db = buildDb({
      findFirst,
      programExerciseCount: 0,
      workoutSetCount: 0,
    });
    const service = new AdminExercisesService(db as never);

    await service.remove('exercise-1');

    expect(db.txDelete).toHaveBeenCalledTimes(2);
  });

  it('throws NotFoundException for an unknown exercise', async () => {
    const findFirst = jest.fn().mockResolvedValue(undefined);
    const db = buildDb({
      findFirst,
      programExerciseCount: 0,
      workoutSetCount: 0,
    });
    const service = new AdminExercisesService(db as never);

    await expect(service.remove('exercise-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

describe('AdminExercisesService.list', () => {
  async function listWhere(authored?: 'true'): Promise<string> {
    let captured: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (clause: SQL) => {
            captured = clause;
            return { orderBy: () => ({ limit: () => Promise.resolve([]) }) };
          },
        }),
      }),
    };
    await new AdminExercisesService(db as never).list({ authored });
    return new PgDialect().sqlToQuery(captured!).sql;
  }

  it('narrows the queue to user-authored entries on request', async () => {
    expect(await listWhere()).not.toContain('author_id');
    expect(await listWhere('true')).toContain(
      '"exercises"."author_id" is not null',
    );
  });
});

describe('AdminExercisesService.setVerified', () => {
  function serviceCapturingSet() {
    const set = jest.fn().mockReturnValue({
      where: () => ({ returning: () => Promise.resolve([{ id: 'e1' }]) }),
    });
    const db = { update: () => ({ set }) };
    return { service: new AdminExercisesService(db as never), set };
  }

  it('clears the author on promotion, so the entry outlives its author', async () => {
    const { service, set } = serviceCapturingSet();
    await service.setVerified('e1', true).catch(() => undefined);
    expect(set).toHaveBeenCalledWith({ isVerified: true, authorId: null });
  });

  it('leaves the author alone on unapprove', async () => {
    const { service, set } = serviceCapturingSet();
    await service.setVerified('e1', false).catch(() => undefined);
    expect(set).toHaveBeenCalledWith({ isVerified: false });
  });
});
