import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Matches DEEPL_TARGET_LOCALES in scripts/seed-food-catalog.ts plus the
// base 'en' - the only locales a translation row could ever exist for.
const LOCALES = ['en', 'uk', 'ru', 'es'] as const;

export class ListFoodItemsDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: (typeof LOCALES)[number];

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
