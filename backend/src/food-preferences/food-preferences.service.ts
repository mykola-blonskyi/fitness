import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { resolveUserLocale } from '../shared/locale';
import type { CreateFoodPreferenceDto } from './dto/create-food-preference.dto';
import {
  toFoodPreferenceResponse,
  type FoodPreferenceResponse,
} from './food-preference.mapper';
import {
  FOOD_PREFERENCE_TARGET_TYPES,
  type ExclusionTargets,
  type FoodPreferenceTargetType,
  type FoodPreferenceType,
} from './food-preference.types';

@Injectable()
export class FoodPreferencesService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // The four tables target_id polymorphically points at - see schema.ts's
  // comment on food_preferences.target_id for why this can't be a real
  // FK. Each table has its own distinct Drizzle type (they're not a
  // common supertype), so this is a switch rather than a lookup object -
  // that would need an unsound cast to type-check.
  private async fetchTargetNames(
    userId: string,
    targetType: FoodPreferenceTargetType,
    ids: string[],
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    switch (targetType) {
      case 'category': {
        const rows = await this.db
          .select({
            id: schema.foodCategories.id,
            name: schema.foodCategories.name,
          })
          .from(schema.foodCategories)
          .where(inArray(schema.foodCategories.id, ids));
        return new Map(rows.map((row) => [row.id, row.name]));
      }
      case 'subcategory': {
        const rows = await this.db
          .select({
            id: schema.foodSubcategories.id,
            name: schema.foodSubcategories.name,
          })
          .from(schema.foodSubcategories)
          .where(inArray(schema.foodSubcategories.id, ids));
        return new Map(rows.map((row) => [row.id, row.name]));
      }
      case 'role': {
        const rows = await this.db
          .select({ id: schema.foodRoles.id, name: schema.foodRoles.name })
          .from(schema.foodRoles)
          .where(inArray(schema.foodRoles.id, ids));
        return new Map(rows.map((row) => [row.id, row.name]));
      }
      case 'food_item': {
        // The only target type with per-locale names - the three taxonomy
        // tables above have no translation table at all.
        const locale = await resolveUserLocale(this.db, userId);
        const rows = await this.db
          .select({
            id: schema.foodCalories.id,
            name: schema.foodCalories.name,
            translatedName: schema.foodCalorieTranslations.name,
          })
          .from(schema.foodCalories)
          .leftJoin(
            schema.foodCalorieTranslations,
            and(
              eq(
                schema.foodCalorieTranslations.foodCalorieId,
                schema.foodCalories.id,
              ),
              eq(schema.foodCalorieTranslations.locale, locale),
            ),
          )
          .where(inArray(schema.foodCalories.id, ids));
        return new Map(
          rows.map((row) => [row.id, row.translatedName ?? row.name]),
        );
      }
    }
  }

  // Used by diets.service.ts (FITNESS-30) to filter candidate Food Items
  // during generation - see knowledge/business-rules.md "Food Preferences
  // target structured entities, not free text". Grouped by targetType so
  // the caller can do one exclusion check per Food Item column
  // (category/subcategory/role/id) instead of scanning every preference
  // row per candidate. Excludes type='favorite' rows - those are the
  // opposite polarity, see getFavoriteFoodItemIds.
  async getExclusionTargets(userId: string): Promise<ExclusionTargets> {
    const rows = await this.db
      .select({
        targetType: schema.foodPreferences.targetType,
        targetId: schema.foodPreferences.targetId,
      })
      .from(schema.foodPreferences)
      .where(
        and(
          eq(schema.foodPreferences.userId, userId),
          inArray(schema.foodPreferences.type, ['allergy', 'exclude'] as const),
        ),
      );

    const result = Object.fromEntries(
      FOOD_PREFERENCE_TARGET_TYPES.map((targetType) => [
        targetType,
        new Set<string>(),
      ]),
    ) as ExclusionTargets;

    for (const row of rows) {
      result[row.targetType].add(row.targetId);
    }

    return result;
  }

  // Used by diets.service.ts to bias generation's pick toward favorited
  // items when any are eligible for that role. Always targetType='food_item'
  // (enforced in create()), so no grouping by targetType is needed here
  // unlike getExclusionTargets.
  async getFavoriteFoodItemIds(userId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ targetId: schema.foodPreferences.targetId })
      .from(schema.foodPreferences)
      .where(
        and(
          eq(schema.foodPreferences.userId, userId),
          eq(schema.foodPreferences.type, 'favorite'),
        ),
      );
    return new Set(rows.map((row) => row.targetId));
  }

  private async familyIdsForFoodItems(
    ids: string[],
  ): Promise<Map<string, string | null>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({
        id: schema.foodCalories.id,
        familyId: schema.foodCalories.familyId,
      })
      .from(schema.foodCalories)
      .where(inArray(schema.foodCalories.id, ids));
    return new Map(rows.map((row) => [row.id, row.familyId]));
  }

  // A favorite on a Food Item with no Family can never reach generation
  // (ADR-020), so the UI marks it rather than pretending it counts.
  private computeAffectsGeneration(
    type: FoodPreferenceType,
    targetId: string,
    familyIdByFoodItemId: Map<string, string | null>,
  ): boolean {
    return type !== 'favorite' || familyIdByFoodItemId.get(targetId) != null;
  }

  private async affectsGenerationOf(
    type: FoodPreferenceType,
    targetId: string,
  ): Promise<boolean> {
    if (type !== 'favorite') return true;
    const familyIds = await this.familyIdsForFoodItems([targetId]);
    return this.computeAffectsGeneration(type, targetId, familyIds);
  }

  async list(userId: string): Promise<FoodPreferenceResponse[]> {
    const rows = await this.db
      .select()
      .from(schema.foodPreferences)
      .where(eq(schema.foodPreferences.userId, userId));

    // One lookup per distinct targetType instead of one per row - a user
    // with a dozen preferences of the same targetType still costs a
    // single extra query for that type.
    const namesByTargetType = new Map<
      FoodPreferenceTargetType,
      Map<string, string>
    >();
    for (const targetType of new Set(rows.map((row) => row.targetType))) {
      const ids = rows
        .filter((row) => row.targetType === targetType)
        .map((row) => row.targetId);
      namesByTargetType.set(
        targetType,
        await this.fetchTargetNames(userId, targetType, ids),
      );
    }

    const favoriteFoodItemIds = rows
      .filter((row) => row.type === 'favorite')
      .map((row) => row.targetId);
    const familyIdByFoodItemId =
      await this.familyIdsForFoodItems(favoriteFoodItemIds);

    return rows.map((row) =>
      toFoodPreferenceResponse(
        row,
        namesByTargetType.get(row.targetType)?.get(row.targetId) ?? null,
        this.computeAffectsGeneration(
          row.type,
          row.targetId,
          familyIdByFoodItemId,
        ),
      ),
    );
  }

  async create(
    userId: string,
    dto: CreateFoodPreferenceDto,
  ): Promise<FoodPreferenceResponse> {
    const targetNames = await this.fetchTargetNames(userId, dto.targetType, [
      dto.targetId,
    ]);
    const targetName = targetNames.get(dto.targetId);
    // A truthy check here would wrongly reject a real target whose name
    // happens to be an empty string - Map.get()'s undefined is the only
    // real "not found" signal.
    if (targetName === undefined) {
      throw new BadRequestException(
        `No ${dto.targetType} found with id ${dto.targetId}`,
      );
    }

    if (dto.type === 'favorite' && dto.targetType !== 'food_item') {
      throw new BadRequestException(
        'Favorites can only target a specific Food Item',
      );
    }

    // Same Food Item can't be both favorited and excluded/allergied at
    // once (ADR-014) - only checked for targetType='food_item' since
    // that's the only type favorite ever uses.
    if (dto.targetType === 'food_item') {
      const opposingTypes: FoodPreferenceType[] =
        dto.type === 'favorite' ? ['allergy', 'exclude'] : ['favorite'];
      const conflict = await this.db.query.foodPreferences.findFirst({
        where: and(
          eq(schema.foodPreferences.userId, userId),
          eq(schema.foodPreferences.targetType, 'food_item'),
          eq(schema.foodPreferences.targetId, dto.targetId),
          inArray(schema.foodPreferences.type, opposingTypes),
        ),
      });
      if (conflict) {
        throw new ConflictException(
          dto.type === 'favorite'
            ? 'This Food Item is already excluded or an allergy - remove that first to favorite it'
            : 'This Food Item is already a favorite - remove that first to exclude it',
        );
      }
    }

    const existing = await this.db.query.foodPreferences.findFirst({
      where: and(
        eq(schema.foodPreferences.userId, userId),
        eq(schema.foodPreferences.type, dto.type),
        eq(schema.foodPreferences.targetType, dto.targetType),
        eq(schema.foodPreferences.targetId, dto.targetId),
      ),
    });
    if (existing) {
      throw new ConflictException('This preference already exists');
    }

    const [inserted] = await this.db
      .insert(schema.foodPreferences)
      .values({
        userId,
        type: dto.type,
        targetType: dto.targetType,
        targetId: dto.targetId,
      })
      .returning();

    return toFoodPreferenceResponse(
      inserted,
      targetName,
      await this.affectsGenerationOf(dto.type, dto.targetId),
    );
  }

  async remove(userId: string, id: string): Promise<FoodPreferenceResponse> {
    const existing = await this.db.query.foodPreferences.findFirst({
      where: and(
        eq(schema.foodPreferences.id, id),
        eq(schema.foodPreferences.userId, userId),
      ),
    });
    if (!existing) {
      throw new NotFoundException('Food preference not found');
    }

    await this.db
      .delete(schema.foodPreferences)
      .where(eq(schema.foodPreferences.id, id));

    const targetName = (
      await this.fetchTargetNames(userId, existing.targetType, [
        existing.targetId,
      ])
    ).get(existing.targetId);
    return toFoodPreferenceResponse(
      existing,
      targetName ?? null,
      await this.affectsGenerationOf(existing.type, existing.targetId),
    );
  }
}
