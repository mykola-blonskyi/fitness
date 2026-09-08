// An untouched <input type="number"> registered with `valueAsNumber` submits
// NaN, not undefined, so `.optional()` never applies and Zod reports its own
// untranslated type error instead of the field's message. Empty selects and
// text inputs submit '' for the same reason.
export const blankToUndefined = (v: unknown) =>
  v === '' || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v;
