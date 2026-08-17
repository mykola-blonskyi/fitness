import {
  resolveOffClassification,
  resolveUsdaClassification,
} from './seed-food-catalog';

describe('resolveOffClassification', () => {
  it('classifies processed meat from a prepared-meats tag regardless of fat', () => {
    expect(
      resolveOffClassification('meat', ['en:prepared-meats'], { fat_100g: 1 }),
    ).toEqual({
      subcategory: 'processed_meat',
      role: 'fatty_protein',
    });
  });

  it('classifies meat as fatty above the fat threshold', () => {
    expect(resolveOffClassification('meat', [], { fat_100g: 15 })).toEqual({
      subcategory: 'fatty_meat',
      role: 'fatty_protein',
    });
  });

  it('classifies meat as lean below the fat threshold', () => {
    expect(resolveOffClassification('meat', [], { fat_100g: 2 })).toEqual({
      subcategory: 'lean_meat',
      role: 'lean_protein',
    });
  });

  it('classifies shellfish from tags regardless of fat', () => {
    expect(
      resolveOffClassification('fish', ['en:crustaceans'], { fat_100g: 20 }),
    ).toEqual({
      subcategory: 'shellfish',
      role: 'lean_protein',
    });
  });

  it('classifies fermented dairy from tags regardless of fat', () => {
    expect(
      resolveOffClassification('dairy', ['en:yogurts'], { fat_100g: 10 }),
    ).toEqual({
      subcategory: 'fermented_dairy',
      role: 'dairy',
    });
  });

  it('classifies starchy vegetables from carb threshold', () => {
    expect(
      resolveOffClassification('vegetables', [], { carbohydrates_100g: 20 }),
    ).toEqual({
      subcategory: 'starchy_vegetables',
      role: 'vegetable',
    });
  });

  it('classifies leafy vegetables from tags over the carb threshold', () => {
    expect(
      resolveOffClassification('vegetables', ['en:leaf-vegetables'], {
        carbohydrates_100g: 20,
      }),
    ).toEqual({ subcategory: 'leafy_vegetables', role: 'vegetable' });
  });

  it('classifies saturated oils from a saturated-fat ratio', () => {
    expect(
      resolveOffClassification('oils', [], {
        fat_100g: 100,
        'saturated-fat_100g': 80,
      }),
    ).toEqual({ subcategory: 'saturated_oils', role: 'saturated_fat' });
  });

  it('classifies healthy oils below the saturated-fat ratio', () => {
    expect(
      resolveOffClassification('oils', [], {
        fat_100g: 100,
        'saturated-fat_100g': 10,
      }),
    ).toEqual({ subcategory: 'healthy_oils', role: 'healthy_fat' });
  });

  it('returns null for an unmapped category', () => {
    expect(resolveOffClassification('unknown', [], {})).toBeNull();
  });
});

describe('resolveUsdaClassification', () => {
  it('classifies processed meat from a bacon description', () => {
    expect(resolveUsdaClassification('meat', 'Pork, bacon, raw')).toEqual({
      subcategory: 'processed_meat',
      role: 'fatty_protein',
    });
  });

  it('classifies fatty fish from a salmon description', () => {
    expect(
      resolveUsdaClassification('fish', 'Fish, salmon, Atlantic, raw'),
    ).toEqual({
      subcategory: 'fatty_fish',
      role: 'fatty_protein',
    });
  });

  it('classifies shellfish from a shrimp description', () => {
    expect(
      resolveUsdaClassification('fish', 'Crustaceans, shrimp, raw'),
    ).toEqual({
      subcategory: 'shellfish',
      role: 'lean_protein',
    });
  });

  it('classifies egg whites distinctly from whole eggs', () => {
    expect(resolveUsdaClassification('eggs', 'Egg, white, raw')).toEqual({
      subcategory: 'egg_whites',
      role: 'lean_protein',
    });
    expect(resolveUsdaClassification('eggs', 'Egg, whole, raw')).toEqual({
      subcategory: 'whole_eggs',
      role: 'lean_protein',
    });
  });

  it('returns null for an unmapped category', () => {
    expect(resolveUsdaClassification('unknown', 'anything')).toBeNull();
  });
});
