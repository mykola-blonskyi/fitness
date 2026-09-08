import * as z from 'zod';
import { WEIGHT_UNITS } from '@shared/types/user';
import { MAX_KG, MAX_LB } from '@shared/constants/weight-unit';
import type { ValidationTranslator } from '@shared/schemas/validation-translator';

// Mirrors backend/src/daily-logs/dto/set-weight.dto.ts exactly - kept in
// sync by hand, not derived from it (no practical way to share
// class-validator decorators with a Zod schema across the Next.js/NestJS
// boundary). The backend DTO stays authoritative; this is a client-side
// UX layer only, see docs/decisions.md.
export function weightSchema(t: ValidationTranslator) {
  return z
    .object({
      weight: z
        .number(t('common.numberRequired'))
        .min(0.1, t('weight.mustBePositive')),
      unit: z.enum(WEIGHT_UNITS),
    })
    .refine((data) => data.weight <= (data.unit === 'kg' ? MAX_KG : MAX_LB), {
      message: t('weight.maxExceeded', { maxKg: MAX_KG, maxLb: MAX_LB }),
      path: ['weight'],
    });
}

export type WeightInput = z.infer<ReturnType<typeof weightSchema>>;
