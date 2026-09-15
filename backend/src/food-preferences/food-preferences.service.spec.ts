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

  function chain(rows: unknown[]) {
    const node = {
      leftJoin: () => node,
      where: () => Promise.resolve(rows),
    };
    return { from: () => node };
  }

  function buildDb(...results: unknown[][]) {
    const select = jest.fn();
    for (const rows of results) select.mockReturnValueOnce(chain(rows));
    return { select };
  }

  const favorite = [
    {
      id: 'pref-1',
      type: 'favorite',
      targetType: 'food_item',
      targetId: 'food-1',
    },
  ];

  const facts = (overrides: Record<string, unknown> = {}) => [
    {
      id: 'food-1',
      familyId: 'family-1',
      caloriesPer100g: '165',
      roleName: 'lean_protein',
      categoryName: 'meat',
      ...overrides,
    },
  ];

  async function affectsGeneration(
    factRows: unknown[],
    dietRows: unknown[] = [],
    prefRows: unknown[] = favorite,
  ): Promise<boolean> {
    const db = buildDb(prefRows, foodItemNameRows, factRows, dietRows);
    const service = new FoodPreferencesService(db as never);
    const [result] = await service.list('user-1');
    return result.affectsGeneration;
  }

  it('marks a reachable favorite as affecting generation', async () => {
    expect(await affectsGeneration(facts())).toBe(true);
  });

  it('marks a favorite with no Family as not affecting generation', async () => {
    expect(await affectsGeneration(facts({ familyId: null }))).toBe(false);
  });

  // Role fruit is in no MEAL_ROLE_CHAINS entry, so generation never queries
  // it. familyId alone reported these as counting.
  it('marks a favorite whose Role no slot draws as not affecting generation', async () => {
    expect(await affectsGeneration(facts({ roleName: 'fruit' }))).toBe(false);
  });

  it('counts a Role dairy favorite, which the protein slot draws since ADR-023', async () => {
    expect(
      await affectsGeneration(
        facts({ roleName: 'dairy', categoryName: 'dairy' }),
      ),
    ).toBe(true);
  });

  it('marks a zero-calorie favorite as not affecting generation', async () => {
    expect(await affectsGeneration(facts({ caloriesPer100g: '0' }))).toBe(
      false,
    );
  });

  it('marks a favorite its own diet type excludes as not affecting generation', async () => {
    expect(await affectsGeneration(facts(), [{ dietType: 'vegetarian' }])).toBe(
      false,
    );
  });

  // The protein pool is animal plus fish until a diet type removes one,
  // so the same legume is unreachable for an omnivore and reachable here.
  it('counts a legume favorite only once the protein pool opens to plants', async () => {
    const lentils = facts({
      roleName: 'plant_protein',
      categoryName: 'legumes',
    });
    expect(await affectsGeneration(lentils)).toBe(false);
    expect(await affectsGeneration(lentils, [{ dietType: 'vegetarian' }])).toBe(
      true,
    );
  });

  it('marks an exclude row as affecting generation regardless of reachability', async () => {
    const excludeRow = [
      {
        id: 'pref-2',
        type: 'exclude',
        targetType: 'food_item',
        targetId: 'food-1',
      },
    ];
    expect(await affectsGeneration([], [], excludeRow)).toBe(true);
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
