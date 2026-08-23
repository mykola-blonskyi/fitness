import { IsUUID } from 'class-validator';

// The replacement Food Item's id. Role-match (same Food Role as the item
// being swapped) and Food/Diet Preference exclusion checks are cross-table
// DB lookups, not expressible as a class-validator decorator - both are
// validated in diets.service.ts's swapItem(), same split
// create-food-preference.dto.ts already uses for its own targetId.
export class SwapDietItemDto {
  @IsUUID()
  foodItemId: string;
}
