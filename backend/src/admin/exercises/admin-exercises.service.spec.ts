import { ConflictException, NotFoundException } from '@nestjs/common';
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
