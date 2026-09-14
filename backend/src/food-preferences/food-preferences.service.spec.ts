import { ConflictException } from '@nestjs/common';
import { DatabaseError } from 'pg';
import { FoodPreferencesService } from './food-preferences.service';
import type { CreateFoodPreferenceDto } from './dto/create-food-preference.dto';

jest.mock('../shared/locale', () => ({
  resolveUserLocale: jest.fn().mockResolvedValue('en'),
}));

function uniqueViolation(): DatabaseError {
  const err = new DatabaseError('duplicate key', 0, 'error');
  err.code = '23505';
  return err;
}

describe('FoodPreferencesService.list', () => {
  const foodItemNameRows = [
    { id: 'food-1', name: 'Chicken Breast', translatedName: null },
  ];

  function buildDb(
    prefRows: unknown[],
    nameRows: unknown[],
    familyRows: unknown[],
  ) {
    const select = jest
      .fn()
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(prefRows),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(nameRows),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(familyRows),
        }),
      });
    return { select };
  }

  it('marks a favorite with no Family as not affecting generation', async () => {
    const prefRows = [
      {
        id: 'pref-1',
        type: 'favorite',
        targetType: 'food_item',
        targetId: 'food-1',
      },
    ];
    const db = buildDb(prefRows, foodItemNameRows, [
      { id: 'food-1', familyId: null },
    ]);
    const service = new FoodPreferencesService(db as never);

    const result = await service.list('user-1');

    expect(result).toEqual([
      expect.objectContaining({ id: 'pref-1', affectsGeneration: false }),
    ]);
  });

  it('marks a favorite with a Family as affecting generation', async () => {
    const prefRows = [
      {
        id: 'pref-1',
        type: 'favorite',
        targetType: 'food_item',
        targetId: 'food-1',
      },
    ];
    const db = buildDb(prefRows, foodItemNameRows, [
      { id: 'food-1', familyId: 'family-1' },
    ]);
    const service = new FoodPreferencesService(db as never);

    const result = await service.list('user-1');

    expect(result).toEqual([
      expect.objectContaining({ id: 'pref-1', affectsGeneration: true }),
    ]);
  });

  it('marks an exclude row as affecting generation regardless of family', async () => {
    const prefRows = [
      {
        id: 'pref-2',
        type: 'exclude',
        targetType: 'food_item',
        targetId: 'food-1',
      },
    ];
    const db = buildDb(prefRows, foodItemNameRows, []);
    const service = new FoodPreferencesService(db as never);

    const result = await service.list('user-1');

    expect(result).toEqual([
      expect.objectContaining({ id: 'pref-2', affectsGeneration: true }),
    ]);
  });
});

describe('FoodPreferencesService.create', () => {
  const dto: CreateFoodPreferenceDto = {
    type: 'exclude',
    targetType: 'category',
    targetId: 'cat-1',
  };

  function buildDb(overrides: { existing: unknown; returning: jest.Mock }) {
    const select = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest
          .fn()
          .mockResolvedValue([{ id: 'cat-1', name: 'Vegetables' }]),
      }),
    });
    const values = jest
      .fn()
      .mockReturnValue({ returning: overrides.returning });
    const insert = jest.fn().mockReturnValue({ values });
    return {
      db: {
        select,
        query: {
          foodPreferences: {
            findFirst: jest.fn().mockResolvedValue(overrides.existing),
          },
        },
        insert,
      },
    };
  }

  it('rejects a duplicate preference found by the pre-check', async () => {
    const { db } = buildDb({
      existing: { id: 'pref-1' },
      returning: jest.fn(),
    });
    const service = new FoodPreferencesService(db as never);

    await expect(service.create('user-1', dto)).rejects.toThrow(
      ConflictException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('turns a concurrent insert racing past the pre-check into a 409', async () => {
    const returning = jest.fn().mockRejectedValue(uniqueViolation());
    const { db } = buildDb({ existing: undefined, returning });
    const service = new FoodPreferencesService(db as never);

    await expect(service.create('user-1', dto)).rejects.toThrow(
      ConflictException,
    );
  });
});
