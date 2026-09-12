import { FOOD_FAMILIES, isFoodFamily } from '../food-items/food-item.types';
import {
  FAMILY_SOURCES,
  OFF_SOURCE,
  RU_TABLE_SOURCE,
  USDA_SOURCE,
  familyOverrideKey,
  resolveFamily,
} from './food-families';
import { tableSourceId } from './seed-food-table-ru';
import { countByRole } from './classify-food-families';
import table from './data/food-table-ru.json';
import overrides from './data/food-families.json';

const ruRow = (section: string, name: string) => ({
  source: RU_TABLE_SOURCE,
  sourceId: tableSourceId(section, name),
  subcategory: 'unused',
  name: 'unused',
});

describe('food family overrides', () => {
  const entries = Object.entries(overrides as Record<string, string | null>);

  it('only ever names a family from the fixed list', () => {
    for (const [, value] of entries) {
      if (value === null) continue;
      expect(isFoodFamily(value)).toBe(true);
    }
    expect(entries.length).toBeGreaterThan(0);
  });

  // The USDA/Open Food Facts half of this is checked against the live
  // catalog by classify-food-families.ts, which has no bundled fixture to
  // check offline the way the RU table does.
  it('names a known source in every key', () => {
    for (const [key] of entries) {
      expect(
        FAMILY_SOURCES.some((source) => key.startsWith(`${source}:`)),
      ).toBe(true);
    }
  });

  it('keys a real bundled catalog row for every RU-table override', () => {
    const known = new Set(
      table.sections.flatMap((section) =>
        section.items.map((item) =>
          familyOverrideKey(
            RU_TABLE_SOURCE,
            tableSourceId(section.key, item.name),
          ),
        ),
      ),
    );
    const ruKeys = entries
      .map(([key]) => key)
      .filter((key) => key.startsWith(`${RU_TABLE_SOURCE}:`));
    expect(ruKeys.length).toBeGreaterThan(0);
    for (const key of ruKeys) expect(known).toContain(key);
  });
});

describe('resolveFamily', () => {
  it('never returns a family outside the fixed list for the bundled table', () => {
    for (const section of table.sections) {
      for (const item of section.items) {
        const family = resolveFamily(ruRow(section.key, item.name));
        if (family !== null) expect(FOOD_FAMILIES).toContain(family);
      }
    }
  });

  it('puts the whole RU porridge section in the porridge family', () => {
    const porridge = table.sections.find((s) => s.key === 'porridge')!;
    expect(porridge.items).toHaveLength(10);
    for (const item of porridge.items) {
      expect(resolveFamily(ruRow('porridge', item.name))).toBe('porridge');
    }
  });

  it('keeps offal, sausages, flours and confectionery out of the pool', () => {
    expect(resolveFamily(ruRow('meat', 'Говяжьи Мозги'))).toBeNull();
    expect(resolveFamily(ruRow('sausages', 'Сосиски Молочные'))).toBeNull();
    expect(
      resolveFamily(ruRow('bread', 'Мука пшеничная высшего сорта')),
    ).toBeNull();
    expect(resolveFamily(ruRow('sweets', 'Зефир'))).toBeNull();
  });

  it('splits the RU fish section into white fish, red fish and seafood', () => {
    expect(resolveFamily(ruRow('fish', 'Треска'))).toBe('white_fish');
    expect(resolveFamily(ruRow('fish', 'Семга'))).toBe('red_fish');
    expect(resolveFamily(ruRow('fish', 'Креветка'))).toBe('seafood');
    expect(resolveFamily(ruRow('fish', 'Крабовые палочки'))).toBeNull();
  });

  it('never infers a family for a branded Open Food Facts row', () => {
    expect(
      resolveFamily({
        source: OFF_SOURCE,
        sourceId: '8719200269743',
        subcategory: 'healthy_oils',
        name: 'BUTTERY',
      }),
    ).toBeNull();
  });

  it('rejects USDA babyfood and prepared dishes by name', () => {
    const usda = (name: string, subcategory: string) => ({
      source: USDA_SOURCE,
      sourceId: '1',
      subcategory,
      name,
    });
    expect(
      resolveFamily(
        usda('Babyfood, vegetables, carrots, junior', 'other_vegetables'),
      ),
    ).toBeNull();
    expect(
      resolveFamily(usda('Potato salad with egg', 'whole_eggs')),
    ).toBeNull();
    expect(
      resolveFamily(
        usda(
          'Chicken, broilers or fryers, light meat, meat only, raw',
          'lean_meat',
        ),
      ),
    ).toBe('poultry');
  });

  it('gives no family to a row with no source', () => {
    expect(
      resolveFamily({
        source: null,
        sourceId: null,
        subcategory: 'lean_meat',
        name: 'Test Chicken Breast',
      }),
    ).toBeNull();
  });

  it('gives no family to a row from a source it does not know', () => {
    expect(
      resolveFamily({
        source: 'some_future_import',
        sourceId: '1',
        subcategory: 'lean_meat',
        name: 'Chicken breast, raw',
      }),
    ).toBeNull();
  });

  it('lets an override win over the inference rules', () => {
    expect(resolveFamily(ruRow('vegetables', 'Картофель вареный'))).toBeNull();
    expect(resolveFamily(ruRow('vegetables', 'Картофель молодой'))).toBe(
      'starchy_vegetable',
    );
  });
});

describe('countByRole', () => {
  it('counts classified and unclassified rows per role', () => {
    expect(
      countByRole([
        { role: 'lean_protein', family: 'poultry' },
        { role: 'lean_protein', family: null },
        { role: 'fruit', family: 'berries' },
      ]),
    ).toEqual([
      { role: 'fruit', classified: 1, unclassified: 0 },
      { role: 'lean_protein', classified: 1, unclassified: 1 },
    ]);
  });
});
