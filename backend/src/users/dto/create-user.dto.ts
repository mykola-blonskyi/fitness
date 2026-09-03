import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { WEIGHT_UNITS, type WeightUnit } from '../../shared/weight-unit';

const GENDERS = ['male', 'female'] as const;
const GOALS = ['weight_loss', 'maintenance', 'muscle_gain'] as const;
const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
] as const;
// Matches list-food-items.dto.ts's LOCALES - the only locales a
// translation row could ever exist for (see schema.ts's users.locale
// comment).
const LOCALES = ['en', 'uk', 'ru', 'es'] as const;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(GENDERS)
  gender: (typeof GENDERS)[number];

  @IsDateString()
  dateOfBirth: string;

  @IsNumber()
  @Min(30)
  @Max(300)
  height: number;

  @IsIn(GOALS)
  goal: (typeof GOALS)[number];

  @IsIn(ACTIVITY_LEVELS)
  activityLevel: (typeof ACTIVITY_LEVELS)[number];

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  // Optional - schema defaults to 3 (breakfast/lunch/dinner) when omitted,
  // see db/schema.ts's users.mealCount comment. Past 4, mealTypeEnum's
  // slots repeat round-robin as later occurrences (ADR-015).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  mealCount?: number;

  // Optional - the schema default ('en') applies when omitted, so
  // existing onboarding callers that don't yet send this field keep
  // working unchanged.
  @IsOptional()
  @IsIn(LOCALES)
  locale?: (typeof LOCALES)[number];

  // Optional - the schema default ('kg') applies when omitted.
  @IsOptional()
  @IsIn(WEIGHT_UNITS)
  defaultWeightUnit?: WeightUnit;
}
