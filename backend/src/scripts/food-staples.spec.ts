import { FOOD_FAMILIES } from '../food-items/food-item.types';
import { CURATED_SOURCE, STAPLE_LOCALES, STAPLES } from './food-staples';
import { resolveFamily, type FamilyInput } from './food-families';
import { TAXONOMY, ROLES } from './seed-food-catalog';
import overrides from './data/food-families.json';

const SOURCE_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('staple set composition', () => {
  it('sets 80..120 total staples', () => {
    expect(STAPLES.length).toBeGreaterThanOrEqual(80);
    expect(STAPLES.length).toBeLessThanOrEqual(120);
  });

  it('gives every Food Family at least three staple members', () => {
    const counts = new Map<string, number>();
    for (const item of STAPLES)
      counts.set(item.family, (counts.get(item.family) ?? 0) + 1);

    for (const family of FOOD_FAMILIES) {
      expect(counts.get(family) ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it('is sorted by family then sourceId', () => {
    for (let i = 1; i < STAPLES.length; i++) {
      const prev = STAPLES[i - 1];
      const curr = STAPLES[i];
      const inOrder =
        prev.family < curr.family ||
        (prev.family === curr.family && prev.sourceId < curr.sourceId);
      expect(inOrder).toBe(true);
    }
  });
});

describe('staple rows', () => {
  it('has unique, kebab-case sourceIds', () => {
    const ids = STAPLES.map((item) => item.sourceId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(SOURCE_ID_PATTERN);
  });

  it('has unique English base names', () => {
    const names = STAPLES.map((item) => item.names.en);
    expect(new Set(names).size).toBe(names.length);
  });

  it('names a real category/subcategory pair from TAXONOMY', () => {
    for (const item of STAPLES) {
      expect(Object.keys(TAXONOMY)).toContain(item.category);
      expect(TAXONOMY[item.category]).toContain(item.subcategory);
    }
  });

  it('names a role from ROLES', () => {
    for (const item of STAPLES) {
      expect(ROLES).toContain(item.role);
    }
  });

  it('has all four non-empty, trimmed locale names', () => {
    for (const item of STAPLES) {
      for (const locale of ['en', 'uk', 'ru', 'es'] as const) {
        const name = item.names[locale];
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
        expect(name).toBe(name.trim());
      }
    }
  });

  it('never writes an "en" translation row', () => {
    expect(STAPLE_LOCALES).not.toContain('en');
  });

  it('has non-negative macros consistent with stated calories', () => {
    for (const item of STAPLES) {
      expect(item.caloriesPer100g).toBeGreaterThanOrEqual(0);
      expect(item.proteinPer100g).toBeGreaterThanOrEqual(0);
      expect(item.carbsPer100g).toBeGreaterThanOrEqual(0);
      expect(item.fatPer100g).toBeGreaterThanOrEqual(0);

      const derived =
        4 * item.proteinPer100g + 4 * item.carbsPer100g + 9 * item.fatPer100g;
      const tolerance = Math.max(15, derived * 0.15);
      expect(Math.abs(item.caloriesPer100g - derived)).toBeLessThanOrEqual(
        tolerance,
      );
    }
  });
});

describe('resolveFamily agreement with the staples file', () => {
  it('resolves every staple to its declared family', () => {
    for (const item of STAPLES) {
      const input: FamilyInput = {
        source: CURATED_SOURCE,
        sourceId: item.sourceId,
        subcategory: item.subcategory,
        name: item.names.en,
      };
      expect(resolveFamily(input)).toBe(item.family);
    }
  });

  it('gives no family to an unknown curated sourceId', () => {
    expect(
      resolveFamily({
        source: CURATED_SOURCE,
        sourceId: 'not-a-real-staple',
        subcategory: 'lean_meat',
        name: 'Nothing',
      }),
    ).toBeNull();
  });

  it('keeps the staples file as the only source of curated families', () => {
    const keys = Object.keys(overrides);
    for (const key of keys) {
      expect(key.startsWith(`${CURATED_SOURCE}:`)).toBe(false);
    }
  });
});
