import { classifyTableItem, tableSourceId } from './seed-food-table-ru';
import table from './data/food-table-ru.json';
import nameOverrides from './data/food-table-ru.names.json';

const item = (
  name: string,
  macros: Partial<{
    protein: number;
    fat: number;
    carbs: number;
    kcal: number;
  }> = {},
) => ({ name, protein: 0, fat: 0, carbs: 0, kcal: 0, ...macros });

describe('classifyTableItem', () => {
  it('maps every section of the bundled table to the taxonomy', () => {
    for (const section of table.sections) {
      for (const row of section.items) {
        expect(classifyTableItem(section.key, row)).not.toBeNull();
      }
    }
  });

  it('returns null for a section it has no mapping for', () => {
    expect(classifyTableItem('unknown', item('x'))).toBeNull();
  });

  it('splits pulses out of the vegetables section into legumes', () => {
    expect(classifyTableItem('vegetables', item('Фасоль'))).toEqual({
      category: 'legumes',
      subcategory: 'beans',
      role: 'plant_protein',
    });
    expect(classifyTableItem('vegetables', item('Горошек зеленый'))).toEqual({
      category: 'legumes',
      subcategory: 'lentils_and_peas',
      role: 'plant_protein',
    });
  });

  it('classifies vegetables by name first, then the starchy carb threshold', () => {
    expect(
      classifyTableItem('vegetables', item('Капуста белокочанная'))
        ?.subcategory,
    ).toBe('cruciferous_vegetables');
    expect(classifyTableItem('vegetables', item('Шпинат'))?.subcategory).toBe(
      'leafy_vegetables',
    );
    expect(
      classifyTableItem('vegetables', item('Чеснок', { carbs: 21.1 }))
        ?.subcategory,
    ).toBe('starchy_vegetables');
    expect(
      classifyTableItem('vegetables', item('Морковь', { carbs: 6.3 }))
        ?.subcategory,
    ).toBe('other_vegetables');
  });

  it('splits dried fruit out of the nuts section by fat content', () => {
    expect(
      classifyTableItem('nuts_and_dried_fruits', item('Курага', { fat: 0 })),
    ).toEqual({
      category: 'fruits',
      subcategory: 'dried_fruit',
      role: 'fruit',
    });
    expect(
      classifyTableItem('nuts_and_dried_fruits', item('Фундук', { fat: 66.7 })),
    ).toEqual({
      category: 'nuts',
      subcategory: 'tree_nuts',
      role: 'healthy_fat',
    });
    expect(
      classifyTableItem(
        'nuts_and_dried_fruits',
        item('Семя подсолнечника', { fat: 52.5 }),
      )?.subcategory,
    ).toBe('seeds');
  });

  it('uses the shared fat thresholds for meat, fish and dairy', () => {
    expect(
      classifyTableItem('meat', item('Телятина', { fat: 1.1 }))?.role,
    ).toBe('lean_protein');
    expect(
      classifyTableItem('meat', item('Баранина', { fat: 15.3 }))?.role,
    ).toBe('fatty_protein');
    expect(
      classifyTableItem('fish', item('Треска', { fat: 0.5 }))?.subcategory,
    ).toBe('lean_fish');
    expect(
      classifyTableItem('fish', item('Сельдь', { fat: 19.9 }))?.subcategory,
    ).toBe('fatty_fish');
    expect(
      classifyTableItem('fish', item('Креветка', { fat: 0.9 }))?.subcategory,
    ).toBe('shellfish');
    expect(
      classifyTableItem('dairy', item('Молоко 0%', { fat: 0 }))?.subcategory,
    ).toBe('low_fat_dairy');
    expect(
      classifyTableItem('dairy', item('Сливки 20%', { fat: 20 }))?.subcategory,
    ).toBe('full_fat_dairy');
    expect(
      classifyTableItem('dairy', item('Кефир 0%', { fat: 0 }))?.subcategory,
    ).toBe('fermented_dairy');
  });

  it('separates animal fats and butter from vegetable oils', () => {
    expect(classifyTableItem('fats', item('Жир свиной топленый'))?.role).toBe(
      'saturated_fat',
    );
    expect(classifyTableItem('fats', item('Масло сливочное 82,5%'))?.role).toBe(
      'saturated_fat',
    );
    expect(classifyTableItem('fats', item('Масло оливковое'))?.role).toBe(
      'healthy_fat',
    );
  });

  it('treats rye bread as a complex carb and the rest of the bread section as simple', () => {
    expect(classifyTableItem('bread', item('Хлеб ржаной'))?.subcategory).toBe(
      'complex_carbs',
    );
    expect(
      classifyTableItem('bread', item('Батон нарезной'))?.subcategory,
    ).toBe('simple_carbs');
  });

  it('routes drinks to the beverages category', () => {
    expect(classifyTableItem('alcoholic_beverages', item('Водка'))).toEqual({
      category: 'beverages',
      subcategory: 'alcoholic_beverages',
      role: 'beverage',
    });
    expect(
      classifyTableItem('non_alcoholic_beverages', item('Квас хлебный')),
    ).toEqual({
      category: 'beverages',
      subcategory: 'non_alcoholic_beverages',
      role: 'beverage',
    });
  });
});

describe('tableSourceId', () => {
  it('is stable across whitespace and case differences in the name', () => {
    expect(tableSourceId('dairy', 'Кефир  1%')).toBe(
      tableSourceId('dairy', 'кефир 1% '),
    );
  });

  it('keeps the same name in different sections distinct', () => {
    expect(tableSourceId('fish', 'Икра')).not.toBe(
      tableSourceId('roe', 'Икра'),
    );
  });

  it('is unique across the whole bundled table', () => {
    const ids = table.sections.flatMap((section) =>
      section.items.map((row) => tableSourceId(section.key, row.name)),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('name overrides', () => {
  const sourceIds = new Set(
    table.sections.flatMap((section) =>
      section.items.map((row) => tableSourceId(section.key, row.name)),
    ),
  );

  // A typo'd key would silently leave the bad machine translation in place.
  it('keys every override to a row that exists in the table', () => {
    for (const key of Object.keys(nameOverrides)) {
      expect(sourceIds.has(key)).toBe(true);
    }
  });

  it('gives every override all three locales, none left blank', () => {
    for (const [key, names] of Object.entries(nameOverrides)) {
      for (const locale of ['en', 'uk', 'es'] as const) {
        expect(`${key}.${locale}=${names[locale]}`).toBe(
          `${key}.${locale}=${names[locale].trim()}`,
        );
        expect(names[locale].length).toBeGreaterThan(0);
      }
    }
  });

  it('replaces the mistranslations that prompted the file', () => {
    expect(nameOverrides['fish:треска'].en).toBe('Cod');
    expect(nameOverrides['fish:сом'].en).toBe('Catfish');
    expect(nameOverrides['sweets:ирис'].en).toBe('Toffee');
    expect(nameOverrides['fish:кета'].uk).toBe('Кета');
  });
});
