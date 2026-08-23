import { IsUUID } from 'class-validator';

// Role-match and preference-exclusion checks are cross-table DB lookups,
// so they're validated in diets.service.ts's swapItem(), not here.
export class SwapDietItemDto {
  @IsUUID()
  foodItemId: string;
}
