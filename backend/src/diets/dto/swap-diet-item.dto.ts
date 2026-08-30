import { IsOptional, IsUUID } from 'class-validator';

// Role-match and preference-exclusion checks are cross-table DB lookups,
// so they're validated in diets.service.ts's swapItem(), not here. An
// omitted foodItemId means "reroll" - the service picks a random valid
// same-Role candidate.
export class SwapDietItemDto {
  @IsOptional()
  @IsUUID()
  foodItemId?: string;
}
