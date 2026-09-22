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
import { isUniqueViolation } from '../shared/db-errors';
import { DietPreferencesService } from '../diet-preferences/diet-preferences.service';
import type { DietType } from '../diet-preferences/diet-preference.types';
import {
  isGenerationReachable,
  type ReachabilityFacts,
} from '../food-items/food-eligibility';
import { FoodItemsService } from '../food-items/food-items.service';
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
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly dietPreferencesService: DietPreferencesService,
    private readonly foodItemsService: FoodItemsService,
  ) {}

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

  // Only a favorite carries this claim. An allergy or exclusion is purely
  // subtractive, so it always lands whether or not the item was reachable.
  private computeAffectsGeneration(
    type: FoodPreferenceType,
    targetId: string,
    factsByFoodItemId: Map<string, ReachabilityFacts>,
    dietTypes: readonly DietType[],
  ): boolean {
    if (type !== 'favorite') return true;
    const facts = factsByFoodItemId.get(targetId);
    return facts !== undefined && isGenerationReachable(facts, dietTypes);
  }

  private async affectsGenerationOf(
    userId: string,
    type: FoodPreferenceType,
    targetId: string,
  ): Promise<boolean> {
    if (type !== 'favorite') return true;
    const [facts, dietTypes] = await Promise.all([
      this.foodItemsService.getReachabilityFacts([targetId]),
      this.dietPreferencesService.listTypes(userId),
    ]);
    return this.computeAffectsGeneration(type, targetId, facts, dietTypes);
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
        await this.foodItemsService.getTargetNames(userId, targetType, ids),
      );
    }

    const favoriteFoodItemIds = rows
      .filter((row) => row.type === 'favorite')
      .map((row) => row.targetId);
    const [factsByFoodItemId, dietTypes] = await Promise.all([
      this.foodItemsService.getReachabilityFacts(favoriteFoodItemIds),
      favoriteFoodItemIds.length > 0
        ? this.dietPreferencesService.listTypes(userId)
        : Promise.resolve([]),
    ]);

    return rows.map((row) =>
      toFoodPreferenceResponse(
        row,
        namesByTargetType.get(row.targetType)?.get(row.targetId) ?? null,
        this.computeAffectsGeneration(
          row.type,
          row.targetId,
          factsByFoodItemId,
          dietTypes,
        ),
      ),
    );
  }

  async create(
    userId: string,
    dto: CreateFoodPreferenceDto,
  ): Promise<FoodPreferenceResponse> {
    const targetNames = await this.foodItemsService.getTargetNames(
      userId,
      dto.targetType,
      [dto.targetId],
    );
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

    let inserted: typeof schema.foodPreferences.$inferSelect;
    try {
      [inserted] = await this.db
        .insert(schema.foodPreferences)
        .values({
          userId,
          type: dto.type,
          targetType: dto.targetType,
          targetId: dto.targetId,
        })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('This preference already exists');
      }
      throw err;
    }

    return toFoodPreferenceResponse(
      inserted,
      targetName,
      await this.affectsGenerationOf(userId, dto.type, dto.targetId),
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
      await this.foodItemsService.getTargetNames(userId, existing.targetType, [
        existing.targetId,
      ])
    ).get(existing.targetId);
    return toFoodPreferenceResponse(
      existing,
      targetName ?? null,
      await this.affectsGenerationOf(userId, existing.type, existing.targetId),
    );
  }
}
