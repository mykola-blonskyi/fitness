import * as z from 'zod';
import type { Macros } from '@shared/types/food';

// `satisfies` ties this to Macros at compile time - if a macro field is
// ever added/renamed there, this schema (and food-item.mapper.ts's DTO)
// fails to typecheck until it's updated too.
const macrosSchema = z.object({
  caloriesPer100g: z.number().min(0, 'Must be 0 or greater'),
  proteinPer100g: z.number().min(0, 'Must be 0 or greater'),
  carbsPer100g: z.number().min(0, 'Must be 0 or greater'),
  fatPer100g: z.number().min(0, 'Must be 0 or greater'),
}) satisfies z.ZodType<Macros>;

// Mirrors backend/src/food-items/dto/create-food-item.dto.ts exactly -
// kept in sync by hand, not derived from it, same convention as
// shared/schemas/weight.ts. The backend DTO stays authoritative; this is
// a client-side UX layer only, see docs/decisions.md.
export const createFoodItemSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    categoryId: z.uuid('Choose a category'),
    subcategoryId: z.uuid('Choose a subcategory'),
    roleId: z.uuid('Choose a role'),
  })
  .extend(macrosSchema.shape);

export type CreateFoodItemInput = z.infer<typeof createFoodItemSchema>;
