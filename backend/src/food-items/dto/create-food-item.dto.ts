import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

// Manually created items get category/subcategory/role ids from the
// same taxonomy the browse UI already fetched (GET /food-items/taxonomy)
// - never free text, so a manual entry can't drift from the fixed set.
export class CreateFoodItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  subcategoryId: string;

  @IsUUID()
  roleId: string;

  @IsNumber()
  @Min(0)
  caloriesPer100g: number;

  @IsNumber()
  @Min(0)
  proteinPer100g: number;

  @IsNumber()
  @Min(0)
  carbsPer100g: number;

  @IsNumber()
  @Min(0)
  fatPer100g: number;
}
