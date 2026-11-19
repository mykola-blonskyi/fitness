import * as z from 'zod';
import type { Macros } from '@shared/types/food';
import type { ValidationTranslator } from '@shared/schemas/validation-translator';

// Mirrors backend/src/food-items/dto/create-food-item.dto.ts exactly -
// kept in sync by hand, not derived from it, same convention as
// shared/schemas/weight.ts. The backend DTO stays authoritative; this is
// a client-side UX layer only, see docs/decisions.md.
export function createFoodItemSchema(t: ValidationTranslator) {
  const macrosSchema = z.object({
    caloriesPer100g: z
      .number(t('common.numberRequired'))
      .min(0, t('foodItem.macroMin'))
      .max(900, t('foodItem.macroMax', { max: 900 })),
    proteinPer100g: z
      .number(t('common.numberRequired'))
      .min(0, t('foodItem.macroMin'))
      .max(100, t('foodItem.macroMax', { max: 100 })),
    carbsPer100g: z
      .number(t('common.numberRequired'))
      .min(0, t('foodItem.macroMin'))
      .max(100, t('foodItem.macroMax', { max: 100 })),
    fatPer100g: z
      .number(t('common.numberRequired'))
      .min(0, t('foodItem.macroMin'))
      .max(100, t('foodItem.macroMax', { max: 100 })),
  }) satisfies z.ZodType<Macros>;

  return z
    .object({
      name: z
        .string()
        .min(1, t('foodItem.nameRequired'))
        .max(100, t('common.tooLong', { max: 100 })),
      categoryId: z.uuid(t('foodItem.categoryRequired')),
      subcategoryId: z.uuid(t('foodItem.subcategoryRequired')),
      roleId: z.uuid(t('foodItem.roleRequired')),
    })
    .extend(macrosSchema.shape);
}

export type CreateFoodItemInput = z.infer<
  ReturnType<typeof createFoodItemSchema>
>;
