import { FoodPreferencesService } from './food-preferences.service';

jest.mock('../shared/locale', () => ({
  resolveUserLocale: jest.fn().mockResolvedValue('en'),
}));

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
