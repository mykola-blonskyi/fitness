import * as z from 'zod';

// Mirrors backend/src/food-items/dto/create-food-item.dto.ts exactly -
// kept in sync by hand, not derived from it, same convention as
// shared/schemas/weight.ts. The backend DTO stays authoritative; this is
// a client-side UX layer only, see docs/decisions.md.
export const createFoodItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  categoryId: z.uuid('Choose a category'),
  subcategoryId: z.uuid('Choose a subcategory'),
  roleId: z.uuid('Choose a role'),
  caloriesPer100g: z.number().min(0, 'Must be 0 or greater'),
  proteinPer100g: z.number().min(0, 'Must be 0 or greater'),
  carbsPer100g: z.number().min(0, 'Must be 0 or greater'),
  fatPer100g: z.number().min(0, 'Must be 0 or greater'),
});

export type CreateFoodItemInput = z.infer<typeof createFoodItemSchema>;
