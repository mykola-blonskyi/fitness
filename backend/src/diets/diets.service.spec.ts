import { DietsService } from './diets.service';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';

function noExclusions(): ExclusionTargets {
  return {
    category: new Set(),
    subcategory: new Set(),
    role: new Set(),
    food_item: new Set(),
  };
}

function buildDb(rows: unknown[]) {
  return {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(rows),
        }),
      }),
    }),
  };
}

describe('DietsService.findGenerationCandidatesByRole', () => {
  it('never returns a Food Item with no Family as a generation candidate', async () => {
    const rows = [
      {
        id: 'wheat-flour',
        roleId: 'role-complex-carb',
        caloriesPer100g: '364',
        proteinPer100g: '10',
        carbsPer100g: '76',
        fatPer100g: '1',
        familyName: null,
      },
      {
        id: 'potato',
        roleId: 'role-complex-carb',
        caloriesPer100g: '77',
        proteinPer100g: '2',
        carbsPer100g: '17',
        fatPer100g: '0.1',
        familyName: 'starchy_vegetable',
      },
    ];
    const db = buildDb(rows);
    const foodPreferencesService = {
      getFavoriteFoodItemIds: jest.fn().mockResolvedValue(new Set<string>()),
    };
    const service = new DietsService(
      db as never,
      {} as never,
      {} as never,
      foodPreferencesService as never,
      {} as never,
    );
    const roleIdByName = new Map([['complex_carb', 'role-complex-carb']]);

    const candidatesByRole = await service['findGenerationCandidatesByRole'](
      'user-1',
      noExclusions(),
      roleIdByName,
    );

    expect(candidatesByRole.get('complex_carb')?.map((c) => c.id)).toEqual([
      'potato',
    ]);
  });
});
