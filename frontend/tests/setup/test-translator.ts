import type { ValidationTranslator } from '@shared/schemas/validation-translator';

// Schema unit tests only assert success/failure, never message content -
// returning the key itself is enough to satisfy the ValidationTranslator
// shape without pulling in next-intl's test harness.
export const testTranslator: ValidationTranslator = (key) => key;
