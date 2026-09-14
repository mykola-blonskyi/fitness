import { NotFoundException } from '@nestjs/common';
import { WorkoutLogsService } from './workout-logs.service';

function buildDb(overrides: {
  workoutLogRow: unknown;
  exercise: unknown;
  inserted: unknown;
}) {
  const select = jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        where: jest
          .fn()
          .mockResolvedValue(
            overrides.workoutLogRow ? [overrides.workoutLogRow] : [],
          ),
      }),
    }),
  });
  const values = jest.fn().mockReturnValue({
    returning: jest.fn().mockResolvedValue([overrides.inserted]),
  });
  const insert = jest.fn().mockReturnValue({ values });

  return {
    query: {
      exercises: { findFirst: jest.fn().mockResolvedValue(overrides.exercise) },
    },
    select,
    insert,
    values,
  };
}

describe('WorkoutLogsService.logSet', () => {
  const workoutLogRow = {
    workoutLog: {
      id: 'log-1',
      dailyLogId: 'daily-1',
      trainingProgramId: null,
      title: 'Ad hoc workout',
      createdAt: new Date('2026-09-14'),
      updatedAt: new Date('2026-09-14'),
    },
    date: '2026-09-14',
  };
  const exercise = {
    id: 'exercise-1',
    name: 'Bench Press',
    category: 'chest' as const,
    imageUrl: null,
  };
  const dto = {
    exerciseId: 'exercise-1',
    weight: 100,
    unit: 'kg' as const,
    reps: 5,
  };

  it('assigns setNumber inside the insert instead of reading existing rows first', async () => {
    const inserted = {
      id: 'set-1',
      exerciseId: 'exercise-1',
      setNumber: 3,
      weight: '100',
      weightUnit: 'kg' as const,
      reps: 5,
      durationSeconds: null,
    };
    const db = buildDb({ workoutLogRow, exercise, inserted });
    const service = new WorkoutLogsService(
      db as never,
      {} as never,
      {} as never,
    );

    const result = await service.logSet('user-1', 'log-1', dto);

    expect(db.select).toHaveBeenCalledTimes(1);
    const [insertedValues] = db.values.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(insertedValues).toMatchObject({
      workoutLogId: 'log-1',
      exerciseId: 'exercise-1',
      weight: '100',
      weightUnit: 'kg',
      reps: 5,
    });
    expect(typeof insertedValues.setNumber).not.toBe('number');
    expect(result.setNumber).toBe(3);
  });

  it('throws NotFoundException when the exercise does not exist', async () => {
    const db = buildDb({
      workoutLogRow,
      exercise: undefined,
      inserted: undefined,
    });
    const service = new WorkoutLogsService(
      db as never,
      {} as never,
      {} as never,
    );

    await expect(service.logSet('user-1', 'log-1', dto)).rejects.toThrow(
      NotFoundException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });
});
