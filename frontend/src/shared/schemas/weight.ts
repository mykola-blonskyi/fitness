import * as z from 'zod';
import { WEIGHT_UNITS } from '@shared/types/user';
import { MAX_KG, MAX_LB } from '@shared/constants/weight-unit';

// Mirrors backend/src/daily-logs/dto/set-weight.dto.ts exactly - kept in
// sync by hand, not derived from it (no practical way to share
// class-validator decorators with a Zod schema across the Next.js/NestJS
// boundary). The backend DTO stays authoritative; this is a client-side
// UX layer only, see docs/decisions.md.
export const weightSchema = z
  .object({
    weight: z.number().min(0.1, 'Weight must be greater than 0'),
    unit: z.enum(WEIGHT_UNITS),
  })
  .refine(
    (data) => data.weight <= (data.unit === 'kg' ? MAX_KG : MAX_LB),
    {
      message: `Weight must be at most ${MAX_KG}kg (${MAX_LB}lb)`,
      path: ['weight'],
    },
  );

export type WeightInput = z.infer<typeof weightSchema>;
