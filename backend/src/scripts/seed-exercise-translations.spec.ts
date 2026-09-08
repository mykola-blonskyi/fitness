import type { ExerciseTranslation } from './seed-exercise-translations';
import translations from './data/exercise-translations.uk-ru.json';

const entries = Object.entries(
  translations as Record<string, ExerciseTranslation>,
);

describe('exercise-translations.uk-ru.json', () => {
  it('carries a uk and ru name for every entry', () => {
    const incomplete = entries.filter(
      ([, names]) => !names.uk?.trim() || !names.ru?.trim(),
    );
    expect(incomplete).toEqual([]);
  });

  // A name left in English is the failure mode this file exists to fix, and
  // it doesn't announce itself - a Cyrillic check is what catches it. "Blaze"
  // (1630) is a proper name and stays as it is.
  it('leaves nothing untranslated but the one proper name', () => {
    const latinOnly = entries.filter(
      ([, names]) => !/[Ѐ-ӿ]/.test(names.uk) || !/[Ѐ-ӿ]/.test(names.ru),
    );
    expect(latinOnly.map(([id]) => id)).toEqual(['1630']);
  });

  it('is keyed by wger id, not by name', () => {
    expect(entries.every(([id]) => /^\d+$/.test(id))).toBe(true);
  });
});
