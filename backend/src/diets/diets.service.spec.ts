import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DietsService } from './diets.service';
import { resolveSlotConstraint } from '../food-items/food-eligibility';
import type { FoodItemRow } from '../food-items/food-item.types';
import type { ExclusionTargets } from '../food-preferences/food-preference.types';

function noExclusions(): ExclusionTargets {
  return {
    category: new Set(),
    subcategory: new Set(),
    role: new Set(),
    food_item: new Set(),
  };
}

const foodItem = (overrides: Partial<FoodItemRow> = {}): FoodItemRow => ({
  id: 'chicken',
  name: 'Chicken breast',
  imageUrl: null,
  categoryId: 'cat-meat',
  subcategoryId: 'sub-poultry',
  roleId: 'role-lean-protein',
  familyId: 'family-poultry',
  caloriesPer100g: '165',
  proteinPer100g: '31',
  carbsPer100g: '0',
  fatPer100g: '3.6',
  source: null,
  sourceId: null,
  isVerified: false,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

const taxonomy = {
  roleIdByName: new Map([
    ['lean_protein', 'role-lean-protein'],
    ['fatty_protein', 'role-fatty-protein'],
    ['plant_protein', 'role-plant-protein'],
    ['dairy', 'role-dairy'],
    ['vegetable', 'role-vegetable'],
    ['healthy_fat', 'role-healthy-fat'],
    ['saturated_fat', 'role-saturated-fat'],
  ]),
  categoryIdByName: new Map([
    ['meat', 'cat-meat'],
    ['fish', 'cat-fish'],
    ['dairy', 'cat-dairy'],
    ['eggs', 'cat-eggs'],
    ['legumes', 'cat-legumes'],
    ['nuts', 'cat-nuts'],
  ]),
};

const proteinSlot = resolveSlotConstraint('role-dairy', taxonomy, []);

function buildService(foodItems: unknown): DietsService {
  return new DietsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    foodItems as never,
  );
}

describe('DietsService.findCandidatesByRole', () => {
  it('groups the returned rows under the role name each one was drawn for', async () => {
    const service = buildService({
      findGenerationCandidates: jest.fn().mockResolvedValue([
        {
          id: 'rice',
          roleId: 'role-complex-carb',
          caloriesPer100g: 130,
          proteinPer100g: 2.7,
          carbsPer100g: 28,
          fatPer100g: 0.3,
          familyName: 'grain_garnish',
          categoryName: 'grains',
        },
      ]),
    });

    const result = await service['findCandidatesByRole'](
      noExclusions(),
      new Map([['complex_carb', 'role-complex-carb']]),
      new Set(['rice']),
    );

    expect(result.get('complex_carb')).toEqual([
      {
        id: 'rice',
        caloriesPer100g: 130,
        proteinPer100g: 2.7,
        carbsPer100g: 28,
        fatPer100g: 0.3,
        familyName: 'grain_garnish',
        categoryName: 'grains',
      },
    ]);
  });

  // greedy-heuristic.ts divides by this value when portion-scaling.
  it('drops a 0-calorie row the catalog is willing to return', async () => {
    const service = buildService({
      findGenerationCandidates: jest.fn().mockResolvedValue([
        {
          id: 'water',
          roleId: 'role-complex-carb',
          caloriesPer100g: 0,
          proteinPer100g: 0,
          carbsPer100g: 0,
          fatPer100g: 0,
          familyName: 'grain_garnish',
          categoryName: 'grains',
        },
      ]),
    });

    const result = await service['findCandidatesByRole'](
      noExclusions(),
      new Map([['complex_carb', 'role-complex-carb']]),
      new Set(['water']),
    );

    expect(result.get('complex_carb')).toEqual([]);
  });

  it('keeps an excluded role out of the ids it asks the catalog for', async () => {
    const findGenerationCandidates = jest.fn().mockResolvedValue([]);
    const exclusions = { ...noExclusions(), role: new Set(['role-dairy']) };

    await buildService({ findGenerationCandidates })['findCandidatesByRole'](
      exclusions,
      new Map([
        ['dairy', 'role-dairy'],
        ['vegetable', 'role-vegetable'],
      ]),
      new Set(['milk']),
    );

    expect(findGenerationCandidates).toHaveBeenCalledWith(
      ['role-vegetable'],
      new Set(['milk']),
      exclusions,
    );
  });
});

describe('DietsService.pickRerollReplacement', () => {
  it('draws from the whole slot, favorited or not (ADR-025)', async () => {
    const rows = [foodItem({ id: 'cod' }), foodItem({ id: 'turkey' })];
    const service = buildService({
      findSlotCandidates: jest.fn().mockResolvedValue(rows),
    });

    const replacement = await service['pickRerollReplacement'](
      foodItem({ roleId: 'role-dairy' }),
      proteinSlot,
      noExclusions(),
      <T>(items: T[]) => items[0],
    );

    expect(replacement.id).toBe('cod');
  });

  it('rejects a slot whose only other rows have no calories', async () => {
    const service = buildService({
      findSlotCandidates: jest
        .fn()
        .mockResolvedValue([foodItem({ id: 'water', caloriesPer100g: '0' })]),
    });

    await expect(
      service['pickRerollReplacement'](
        foodItem({ roleId: 'role-dairy' }),
        proteinSlot,
        noExclusions(),
        <T>(items: T[]) => items[0],
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe('DietsService.resolveExplicitReplacement', () => {
  function buildWith(replacement: FoodItemRow): DietsService {
    return buildService({
      findRow: jest.fn().mockResolvedValue(replacement),
    });
  }

  it('rejects a replacement with no Family', async () => {
    await expect(
      buildWith(foodItem({ id: 'wheat-flour', familyId: null }))[
        'resolveExplicitReplacement'
      ]('wheat-flour', proteinSlot, noExclusions(), new Set(['wheat-flour'])),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a replacement outside the favorites (ADR-025)', async () => {
    await expect(
      buildWith(foodItem({ id: 'cod' }))['resolveExplicitReplacement'](
        'cod',
        proteinSlot,
        noExclusions(),
        new Set(['turkey']),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('accepts a favorited, Family-classified replacement in the same slot', async () => {
    const replacement = await buildWith(
      foodItem({
        id: 'cod',
        roleId: 'role-lean-protein',
        categoryId: 'cat-fish',
      }),
    )['resolveExplicitReplacement'](
      'cod',
      proteinSlot,
      noExclusions(),
      new Set(['cod']),
    );

    expect(replacement.id).toBe('cod');
  });

  it('rejects a replacement from another slot', async () => {
    await expect(
      buildWith(
        foodItem({
          id: 'olive-oil',
          roleId: 'role-healthy-fat',
          categoryId: 'cat-oils',
        }),
      )['resolveExplicitReplacement'](
        'olive-oil',
        proteinSlot,
        noExclusions(),
        new Set(['olive-oil']),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
