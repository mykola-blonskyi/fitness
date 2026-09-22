import { ConflictException } from '@nestjs/common';
import { DatabaseError } from 'pg';
import { FoodPreferencesService } from './food-preferences.service';
import type { ReachabilityFacts } from '../food-items/food-eligibility';
import type { CreateFoodPreferenceDto } from './dto/create-food-preference.dto';

function uniqueViolation(): DatabaseError {
  const err = new DatabaseError('duplicate key', 0, 'error');
  err.code = '23505';
  return err;
}

describe('FoodPreferencesService.list', () => {
  function buildDb(prefRows: unknown[]) {
    return {
      select: () => ({
        from: () => ({ where: () => Promise.resolve(prefRows) }),
      }),
    };
  }

  const favorite = [
    {
      id: 'pref-1',
      type: 'favorite',
      targetType: 'food_item',
      targetId: 'food-1',
    },
  ];

  const facts = (
    overrides: Partial<ReachabilityFacts> = {},
  ): ReachabilityFacts => ({
    familyId: 'family-1',
    caloriesPer100g: 165,
    roleName: 'lean_protein',
    categoryName: 'meat',
    ...overrides,
  });

  async function affectsGeneration(
    itemFacts: ReachabilityFacts | null,
    dietTypes: string[] = [],
    prefRows: unknown[] = favorite,
  ): Promise<boolean> {
    const service = new FoodPreferencesService(
      buildDb(prefRows) as never,
      { listTypes: jest.fn().mockResolvedValue(dietTypes) } as never,
      {
        getTargetNames: jest
          .fn()
          .mockResolvedValue(new Map([['food-1', 'Chicken Breast']])),
        getReachabilityFacts: jest
          .fn()
          .mockResolvedValue(
            itemFacts ? new Map([['food-1', itemFacts]]) : new Map(),
          ),
      } as never,
    );
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
    expect(await affectsGeneration(facts({ caloriesPer100g: 0 }))).toBe(false);
  });

  it('marks a favorite its own diet type excludes as not affecting generation', async () => {
    expect(await affectsGeneration(facts(), ['vegetarian'])).toBe(false);
  });

  // The protein pool is animal plus fish until a diet type removes one,
  // so the same legume is unreachable for an omnivore and reachable here.
  it('counts a legume favorite only once the protein pool opens to plants', async () => {
    const lentils = facts({
      roleName: 'plant_protein',
      categoryName: 'legumes',
    });
    expect(await affectsGeneration(lentils)).toBe(false);
    expect(await affectsGeneration(lentils, ['vegetarian'])).toBe(true);
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
    expect(await affectsGeneration(null, [], excludeRow)).toBe(true);
  });
});

describe('FoodPreferencesService.create', () => {
  const dto: CreateFoodPreferenceDto = {
    type: 'exclude',
    targetType: 'category',
    targetId: 'cat-1',
  };

  function buildDb(overrides: { existing: unknown; returning: jest.Mock }) {
    const values = jest
      .fn()
      .mockReturnValue({ returning: overrides.returning });
    const insert = jest.fn().mockReturnValue({ values });
    return {
      query: {
        foodPreferences: {
          findFirst: jest.fn().mockResolvedValue(overrides.existing),
        },
      },
      insert,
    };
  }

  function buildService(db: unknown): FoodPreferencesService {
    return new FoodPreferencesService(
      db as never,
      {} as never,
      {
        getTargetNames: jest
          .fn()
          .mockResolvedValue(new Map([['cat-1', 'Vegetables']])),
      } as never,
    );
  }

  it('rejects a duplicate preference found by the pre-check', async () => {
    const db = buildDb({ existing: { id: 'pref-1' }, returning: jest.fn() });

    await expect(buildService(db).create('user-1', dto)).rejects.toThrow(
      ConflictException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('turns a concurrent insert racing past the pre-check into a 409', async () => {
    const returning = jest.fn().mockRejectedValue(uniqueViolation());
    const db = buildDb({ existing: undefined, returning });

    await expect(buildService(db).create('user-1', dto)).rejects.toThrow(
      ConflictException,
    );
  });
});
