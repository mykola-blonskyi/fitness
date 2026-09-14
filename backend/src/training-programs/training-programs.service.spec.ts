import { NotFoundException } from '@nestjs/common';
import { TrainingProgramsService } from './training-programs.service';

function buildDb(overrides: {
  program: unknown;
  exercise: unknown;
  inserted: unknown;
}) {
  const values = jest.fn().mockReturnValue({
    returning: jest.fn().mockResolvedValue([overrides.inserted]),
  });
  const insert = jest.fn().mockReturnValue({ values });

  return {
    query: {
      trainingPrograms: {
        findFirst: jest.fn().mockResolvedValue(overrides.program),
      },
      exercises: {
        findFirst: jest.fn().mockResolvedValue(overrides.exercise),
      },
    },
    insert,
    values,
  };
}

describe('TrainingProgramsService.addExercise', () => {
  const program = {
    id: 'program-1',
    userId: 'user-1',
    isArchived: false,
  };
  const exercise = {
    id: 'exercise-1',
    name: 'Squat',
    category: 'legs' as const,
    imageUrl: null,
  };
  const dto = { exerciseId: 'exercise-1', targetSets: 3, targetReps: 10 };

  it('assigns orderIndex inside the insert instead of reading existing rows first', async () => {
    const inserted = {
      id: 'program-exercise-1',
      exerciseId: 'exercise-1',
      orderIndex: 2,
      targetSets: 3,
      targetReps: 10,
      targetDurationSeconds: null,
    };
    const db = buildDb({ program, exercise, inserted });
    const service = new TrainingProgramsService(db as never);

    const result = await service.addExercise('user-1', 'program-1', dto);

    const [insertedValues] = db.values.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(insertedValues).toMatchObject({
      trainingProgramId: 'program-1',
      exerciseId: 'exercise-1',
      targetSets: 3,
      targetReps: 10,
    });
    expect(typeof insertedValues.orderIndex).not.toBe('number');
    expect(result.orderIndex).toBe(2);
  });

  it('throws NotFoundException when the exercise does not exist', async () => {
    const db = buildDb({ program, exercise: undefined, inserted: undefined });
    const service = new TrainingProgramsService(db as never);

    await expect(
      service.addExercise('user-1', 'program-1', dto),
    ).rejects.toThrow(NotFoundException);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
